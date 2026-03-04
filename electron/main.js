const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const os = require('os')
const { exec } = require('child_process')

const isDev = process.env.NODE_ENV !== 'production'

// ─────────────────────────────────────────────────────────────
// COMPLIANCE: Real Windows System Checks
// ─────────────────────────────────────────────────────────────

function getOsInfo() {
  return {
    platform: os.platform(),          // 'win32'
    release: os.release(),            // e.g. '10.0.22631'
    type: os.type(),                  // 'Windows_NT'
    arch: os.arch(),                  // 'x64'
    hostname: os.hostname(),
    totalMem: Math.round(os.totalmem() / (1024 ** 3)),   // GB
    freeMem:  Math.round(os.freemem()  / (1024 ** 3)),   // GB
  }
}

function checkWindowsBuild(release) {
  // Windows 10 starts at build 10.0.10240, Win11 at 10.0.22000
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
    // Query Windows Security Center (WMI) for installed antivirus
    const cmd = `powershell -NoProfile -Command "Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct | Select-Object displayName,productState | ConvertTo-Json -Compress"`

    exec(cmd, { timeout: 8000 }, (err, stdout, stderr) => {
      if (err || !stdout.trim()) {
        resolve({ found: false, products: [] })
        return
      }
      try {
        let data = JSON.parse(stdout.trim())
        // WMI can return a single object or an array
        if (!Array.isArray(data)) data = [data]
        const products = data.map(p => ({
          name: p.displayName || 'Unknown AV',
          // productState encodes status: bit 12 = enabled, bit 4 = up-to-date
          enabled: ((p.productState >> 12) & 0xF) === 1,
        }))
        resolve({ found: products.length > 0, products })
      } catch {
        resolve({ found: false, products: [] })
      }
    })
  })
}

function runBitLockerQuery() {
  return new Promise((resolve) => {
    // Query BitLocker protection status for all drives
    const cmd = `powershell -NoProfile -Command "Get-BitLockerVolume | Select-Object MountPoint,ProtectionStatus,EncryptionPercentage | ConvertTo-Json -Compress"`
    exec(cmd, { timeout: 8000 }, (err, stdout, stderr) => {
      if (err || !stdout.trim()) {
        resolve({ enabled: false, drives: [], error: true })
        return
      }
      try {
        let data = JSON.parse(stdout.trim())
        if (!Array.isArray(data)) data = [data]
        const drives = data.map(d => ({
          mountPoint: d.MountPoint,
          // ProtectionStatus: 0 = Off, 1 = On
          protected: d.ProtectionStatus === 1,
          encryptionPct: d.EncryptionPercentage ?? 0,
        }))
        const systemDrive = drives.find(d => d.mountPoint === 'C:') || drives[0]
        resolve({
          enabled: systemDrive ? systemDrive.protected : false,
          drives,
          error: false,
        })
      } catch {
        resolve({ enabled: false, drives: [], error: true })
      }
    })
  })
}

// ─────────────────────────────────────────────────────────────
// IPC HANDLER: compliance:run
// ─────────────────────────────────────────────────────────────

ipcMain.handle('compliance:run', async () => {
  const osInfo   = getOsInfo()
  const osBuild  = checkWindowsBuild(osInfo.release)
  const [avResult, blResult] = await Promise.all([
    runAntivirusQuery(),
    runBitLockerQuery(),
  ])

  const diskFreeGb = osInfo.freeMem
  const ramTotalGb = osInfo.totalMem

  return {
    os: {
      label:    osBuild.label,
      release:  osInfo.release,
      platform: osInfo.platform,
      arch:     osInfo.arch,
      pass:     osBuild.pass,
    },
    antivirus: {
      found:    avResult.found,
      products: avResult.products,
      pass:     avResult.found,
    },
    bitlocker: {
      enabled: blResult.enabled,
      drives:  blResult.drives,
      pass:    blResult.enabled,
      error:   blResult.error,
    },
    disk: {
      freeGb:  diskFreeGb,
      totalGb: ramTotalGb,
      pass:    diskFreeGb >= 2,
    },
    overall: osBuild.pass && avResult.found && blResult.enabled && diskFreeGb >= 2,
  }
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

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
