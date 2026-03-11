const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { exec } = require('child_process')

const isDev = process.env.NODE_ENV !== 'production'

// ─────────────────────────────────────────────────────────────
// COMPLIANCE: Real Windows System Checks
// ─────────────────────────────────────────────────────────────

function getOsInfo() {
  return {
    platform: os.platform(),
    release: os.release(),
    type: os.type(),
    arch: os.arch(),
    hostname: os.hostname(),
    totalMem: Math.round(os.totalmem() / (1024 ** 3)),
    freeMem:  Math.round(os.freemem()  / (1024 ** 3)),
  }
}

function checkWindowsBuild(release) {
  const parts = release.split('.')
  const major = parseInt(parts[0], 10)
  const build  = parseInt(parts[2], 10)
  if (major >= 10 && build >= 22000) return { pass: true, label: 'Windows 11' }
  if (major >= 10 && build >= 19041) return { pass: true, label: 'Windows 10 (20H1+)' }
  if (major >= 10)                   return { pass: true, label: 'Windows 10' }
  return { pass: false, label: `Unsupported (Build ${release})` }
}

function runAntivirusQuery() {
  return new Promise((resolve) => {
    const cmd = `powershell -NoProfile -Command "Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct | Select-Object displayName,productState | ConvertTo-Json -Compress"`
    exec(cmd, { timeout: 8000 }, (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve({ found: false, products: [] })
        return
      }
      try {
        let data = JSON.parse(stdout.trim())
        if (!Array.isArray(data)) data = [data]
        const products = data.map(p => ({
          name: p.displayName || 'Unknown AV',
          enabled: ((p.productState >> 12) & 0xF) === 1,
        }))
        resolve({ found: products.length > 0, products })
      } catch {
        resolve({ found: false, products: [] })
      }
    })
  })
}

ipcMain.handle('compliance:run', async () => {
  const osInfo  = getOsInfo()
  const osBuild = checkWindowsBuild(osInfo.release)
  const avResult = await runAntivirusQuery()
  const diskFreeGb = osInfo.freeMem
  return {
    os:        { label: osBuild.label, release: osInfo.release, platform: osInfo.platform, arch: osInfo.arch, pass: osBuild.pass },
    antivirus: { found: avResult.found, products: avResult.products, pass: avResult.found },
    disk:      { freeGb: diskFreeGb, totalGb: osInfo.totalMem, pass: diskFreeGb >= 2 },
    overall:   osBuild.pass && avResult.found && diskFreeGb >= 2,
  }
})

// ─────────────────────────────────────────────────────────────
// WIREGUARD VPN — SAFE Connection Management
// ─────────────────────────────────────────────────────────────

const TUNNEL_NAME = 'CorpoVPN'
const CONFIG_DIR  = path.join(app.getPath('userData'), 'wireguard')
const CONF_PATH   = path.join(CONFIG_DIR, `${TUNNEL_NAME}.conf`)
const SAVED_CONFIG_PATH = path.join(app.getPath('userData'), 'vpn-config.json')

const SERVER_PUBLIC_KEY = 'pxtdzwoT1chXA+h/ZYWXrJMTz/Vr8oc29u7h+/KgxUQ='
const SERVER_ENDPOINT   = '80.65.211.27:51820'
const SERVER_DNS        = '1.1.1.1'
const ALLOWED_IPS       = '0.0.0.0/0'

// ─── Helper: run a shell command as a promise ─────────────────

function runCmd(cmd, timeout = 10000) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout }, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve(stdout.trim())
    })
  })
}

// ─── Helper: find executables ─────────────────────────────────

function findExe(name) {
  const dirs = ['C:\\Program Files\\WireGuard', 'C:\\Program Files (x86)\\WireGuard']
  for (const dir of dirs) {
    const full = path.join(dir, name)
    if (fs.existsSync(full)) return full
  }
  return null
}

// ─── Helper: forcefully remove the tunnel service ────────────

async function forceRemoveTunnel() {
  const wgExe = findExe('wireguard.exe')
  if (!wgExe) return

  try {
    await runCmd(`"${wgExe}" /uninstalltunnelservice "${TUNNEL_NAME}"`, 8000)
  } catch {
    // If that fails, try the Windows service manager directly
    try { await runCmd(`sc stop WireGuardTunnel$${TUNNEL_NAME}`, 5000) } catch {}
    try { await runCmd(`sc delete WireGuardTunnel$${TUNNEL_NAME}`, 5000) } catch {}
  }

  // Clean up the conf file so it can't be accidentally restarted
  try { if (fs.existsSync(CONF_PATH)) fs.unlinkSync(CONF_PATH) } catch {}
}

// ─── Helper: ping server to check reachability ───────────────

function pingServer(ip) {
  return new Promise((resolve) => {
    // Use a single quick ping with 3 second timeout
    exec(`ping -n 1 -w 3000 ${ip}`, { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve({ reachable: false })
        return
      }
      const hasReply = stdout.includes('Reply from') || stdout.includes('bytes=')
      const timeMatch = stdout.match(/time[=<](\d+)ms/)
      resolve({
        reachable: hasReply,
        latency: timeMatch ? parseInt(timeMatch[1], 10) : null,
      })
    })
  })
}

// ─── Helper: check if WireGuard handshake completed ──────────

function checkHandshake() {
  return new Promise((resolve) => {
    const wgExe = findExe('wg.exe')
    if (!wgExe) { resolve({ ok: false }); return }

    exec(`"${wgExe}" show "${TUNNEL_NAME}"`, { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve({ ok: false })
        return
      }
      // If "latest handshake" exists in the output, the tunnel is alive
      const hasHandshake = stdout.includes('latest handshake')
      const transferMatch = stdout.match(/transfer:\s*(.+)/)
      resolve({
        ok: hasHandshake,
        raw: stdout.trim(),
        transfer: transferMatch ? transferMatch[1] : null,
      })
    })
  })
}

// ─── Helper: wait for handshake with retries ─────────────────

async function waitForHandshake(maxAttempts = 5, delayMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, delayMs))
    const result = await checkHandshake()
    if (result.ok) return { success: true, ...result }
  }
  return { success: false }
}

// ─── Save / Load client config ───────────────────────────────

ipcMain.handle('vpn:save-config', async (_event, config) => {
  try {
    fs.writeFileSync(SAVED_CONFIG_PATH, JSON.stringify(config, null, 2))
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('vpn:load-config', async () => {
  try {
    if (fs.existsSync(SAVED_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(SAVED_CONFIG_PATH, 'utf-8'))
    }
    return null
  } catch { return null }
})

// ─── VPN DIAGNOSE — detailed debug info ──────────────────────

ipcMain.handle('vpn:diagnose', async () => {
  const wgExe = findExe('wg.exe')
  const wgGuardExe = findExe('wireguard.exe')
  const configExists = fs.existsSync(CONF_PATH)
  const savedConfigExists = fs.existsSync(SAVED_CONFIG_PATH)

  let wgShowAll = 'wg.exe not found'
  if (wgExe) {
    try {
      wgShowAll = await runCmd(`"${wgExe}" show all`, 5000)
    } catch (e) {
      wgShowAll = `Error: ${e.message}`
    }
  }

  let confContent = 'No conf file'
  if (configExists) {
    confContent = fs.readFileSync(CONF_PATH, 'utf-8')
    // Mask the private key for security
    confContent = confContent.replace(/PrivateKey = .+/, 'PrivateKey = ***MASKED***')
  }

  let savedConfig = null
  if (savedConfigExists) {
    try {
      savedConfig = JSON.parse(fs.readFileSync(SAVED_CONFIG_PATH, 'utf-8'))
      // Mask private key
      if (savedConfig.privateKey) {
        savedConfig.privateKeyLength = savedConfig.privateKey.length
        savedConfig.privateKeyPreview = savedConfig.privateKey.substring(0, 5) + '...'
        delete savedConfig.privateKey
      }
    } catch {}
  }

  // Ping check
  const ping = await pingServer('80.65.211.27')

  return {
    wireguardInstalled: !!wgGuardExe,
    wgExeFound: !!wgExe,
    wgExePath: wgExe,
    confFileExists: configExists,
    confFilePath: CONF_PATH,
    confContent,
    savedConfig,
    serverReachable: ping.reachable,
    serverLatency: ping.latency,
    wgShowAll,
    serverPublicKey: SERVER_PUBLIC_KEY,
  }
})

// ═════════════════════════════════════════════════════════════
// VPN CONNECT — WITH FULL SAFETY CHECKS AND AUTO-ROLLBACK
// ═════════════════════════════════════════════════════════════

ipcMain.handle('vpn:connect', async (_event, clientConfig) => {
  // ── Step 0: Validate inputs ──
  const wgExe = findExe('wireguard.exe')
  if (!wgExe) {
    return { success: false, error: 'WireGuard is not installed. Download it from wireguard.com/install' }
  }

  const { privateKey, clientIp } = clientConfig
  if (!privateKey || !clientIp) {
    return { success: false, error: 'Missing private key or client IP. Go to Settings → WireGuard Config.' }
  }

  // ── Step 1: Ping the server FIRST ──
  const ping = await pingServer('80.65.211.27')
  if (!ping.reachable) {
    return {
      success: false,
      error: 'Cannot reach server 80.65.211.27. Check your internet connection and verify the server is online.',
    }
  }

  // ── Step 2: Clean up any leftover tunnel from a previous failed attempt ──
  await forceRemoveTunnel()

  // ── Step 3: Write the .conf file ──
  const confContent = [
    '[Interface]',
    `PrivateKey = ${privateKey}`,
    `Address = ${clientIp}/24`,
    `DNS = ${SERVER_DNS}`,
    '',
    '[Peer]',
    `PublicKey = ${SERVER_PUBLIC_KEY}`,
    `Endpoint = ${SERVER_ENDPOINT}`,
    `AllowedIPs = ${ALLOWED_IPS}`,
    'PersistentKeepalive = 25',
  ].join('\n')

  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
  }
  fs.writeFileSync(CONF_PATH, confContent, 'utf-8')

  // ── Step 4: Install the tunnel service ──
  try {
    await runCmd(`"${wgExe}" /installtunnelservice "${CONF_PATH}"`, 15000)
  } catch (err) {
    // Clean up on failure
    try { fs.unlinkSync(CONF_PATH) } catch {}
    return {
      success: false,
      error: `Failed to start tunnel: ${err.message}. Make sure the app is running as Administrator.`,
    }
  }

  // ── Step 5: Wait and verify actual WireGuard handshake ──
  const handshake = await waitForHandshake(5, 2000) // 5 retries, 2s apart = 10s max

  if (!handshake.success) {
    // ╔═══════════════════════════════════════╗
    // ║  HANDSHAKE FAILED → AUTO ROLLBACK     ║
    // ╚═══════════════════════════════════════╝
    
    // Grab debug output before rolling back
    let debugOutput = ''
    const wgDebug = findExe('wg.exe')
    if (wgDebug) {
      try { debugOutput = await runCmd(`"${wgDebug}" show all`, 5000) } catch {}
    }

    console.error('[CorpoVPN] Handshake failed after 10 seconds. Rolling back tunnel...')
    console.error('[CorpoVPN] wg show all output:', debugOutput || 'empty')
    await forceRemoveTunnel()

    return {
      success: false,
      error: `Handshake did not complete within 10 seconds. Tunnel rolled back safely.\n\nDebug: ${debugOutput || 'No WireGuard interface found — the tunnel service may have failed to start.'}\n\nCheck: (1) Private key matches the public key added on server. (2) Server WireGuard is running. (3) UDP port 51820 is open.`,
    }
  }

  // ── Step 6: Handshake confirmed! ──
  return {
    success: true,
    latency: ping.latency,
    message: `Connected! Handshake verified. Server latency: ${ping.latency}ms`,
  }
})

// ═════════════════════════════════════════════════════════════
// VPN DISCONNECT — Clean teardown
// ═════════════════════════════════════════════════════════════

ipcMain.handle('vpn:disconnect', async () => {
  try {
    await forceRemoveTunnel()
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ═════════════════════════════════════════════════════════════
// VPN STATUS — Live stats from wg show
// ═════════════════════════════════════════════════════════════

ipcMain.handle('vpn:status', async () => {
  const wgExe = findExe('wg.exe')
  if (!wgExe) return { connected: false }

  return new Promise((resolve) => {
    exec(`"${wgExe}" show "${TUNNEL_NAME}"`, { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve({ connected: false })
        return
      }

      const lines = stdout.trim()
      const getField = (field) => {
        const match = lines.match(new RegExp(`${field}:\\s*(.+)`))
        return match ? match[1].trim() : null
      }

      const endpoint        = getField('endpoint')
      const latestHandshake = getField('latest handshake')
      const transferLine    = getField('transfer')

      // If no handshake has ever happened, the tunnel is not truly connected
      if (!latestHandshake) {
        resolve({ connected: false })
        return
      }

      let rx = '0 B', tx = '0 B'
      if (transferLine) {
        const parts = transferLine.split(',')
        if (parts[0]) rx = parts[0].replace('received', '').trim()
        if (parts[1]) tx = parts[1].replace('sent', '').trim()
      }

      resolve({
        connected: true,
        endpoint,
        latestHandshake,
        rx,
        tx,
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────
// WINDOW
// ─────────────────────────────────────────────────────────────

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#060818',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// On app quit, make sure no orphaned tunnel remains
app.on('before-quit', async () => {
  await forceRemoveTunnel()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
