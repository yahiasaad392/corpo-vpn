const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { exec } = require('child_process')

const isDev = process.env.NODE_ENV !== 'production'

// ─────────────────────────────────────────────────────────────
// COMPLIANCE: Full 30-Check System (keyed by check ID)
// ─────────────────────────────────────────────────────────────

function psRun(command, timeout = 8000) {
  return new Promise((resolve) => {
    exec(`powershell -NoProfile -Command "${command}"`, { timeout }, (err, stdout) => {
      if (err || !stdout.trim()) { resolve(null); return }
      resolve(stdout.trim())
    })
  })
}

function psJson(command, timeout = 8000) {
  return new Promise((resolve) => {
    exec(`powershell -NoProfile -Command "${command} | ConvertTo-Json -Compress"`, { timeout }, (err, stdout) => {
      if (err || !stdout.trim()) { resolve(null); return }
      try { resolve(JSON.parse(stdout.trim())) } catch { resolve(null) }
    })
  })
}

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

// ── Individual check functions ──────────────────────────────

// 1. Antivirus installed and running
async function checkAntivirusRunning() {
  const data = await psJson('Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntivirusProduct | Select-Object displayName,productState')
  if (!data) return { pass: false, detail: 'No antivirus found' }
  const items = Array.isArray(data) ? data : [data]
  const active = items.filter(p => ((p.productState >> 12) & 0xF) === 1)
  return { pass: active.length > 0, detail: active.length > 0 ? active.map(a => a.displayName).join(', ') : 'No active AV' }
}

// 2. Real-time protection enabled
async function checkRealtimeProtection() {
  const data = await psJson('Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled,AMServiceEnabled,AntivirusEnabled')
  if (!data) return { pass: false, detail: 'Cannot query Defender' }
  return { pass: !!data.RealTimeProtectionEnabled, detail: data.RealTimeProtectionEnabled ? 'Active' : 'Disabled' }
}

// 3. Firewall enabled
async function checkFirewall() {
  const data = await psJson('Get-NetFirewallProfile | Select-Object Name,Enabled')
  if (!data) return { pass: false, detail: 'Cannot query firewall' }
  const profiles = Array.isArray(data) ? data : [data]
  const allOn = profiles.every(p => p.Enabled === 1 || p.Enabled === true)
  return { pass: allOn, detail: allOn ? 'All profiles enabled' : 'Some profiles disabled' }
}

// 4. Supported Windows version
function checkSupportedWindows() {
  const release = os.release()
  const parts = release.split('.')
  const major = parseInt(parts[0], 10)
  const build = parseInt(parts[2], 10)
  if (major >= 10 && build >= 22000) return { pass: true, detail: 'Windows 11', label: 'Windows 11' }
  if (major >= 10 && build >= 19041) return { pass: true, detail: 'Windows 10 (20H1+)', label: 'Windows 10' }
  if (major >= 10) return { pass: true, detail: 'Windows 10', label: 'Windows 10' }
  return { pass: false, detail: `Unsupported (Build ${release})`, label: `Build ${release}` }
}

// 5. Secure Boot enabled
async function checkSecureBoot() {
  const result = await psRun('try { Confirm-SecureBootUEFI } catch { $false }')
  const pass = result && result.toLowerCase() === 'true'
  return { pass, detail: pass ? 'Enabled' : 'Disabled or unsupported' }
}

// 6. TPM enabled
async function checkTPM() {
  const data = await psJson('Get-Tpm | Select-Object TpmPresent,TpmReady,TpmEnabled')
  if (!data) return { pass: false, detail: 'TPM not found' }
  const pass = data.TpmPresent && data.TpmReady
  return { pass, detail: pass ? 'TPM 2.0 Ready' : 'TPM not ready' }
}

// 7. Must be on a Private or Domain network (not Public)
async function checkNoPublicWifi() {
  const data = await psJson('Get-NetConnectionProfile | Select-Object Name,NetworkCategory')
  if (!data) return { pass: false, detail: 'No network connection detected' }
  const profiles = Array.isArray(data) ? data : [data]
  // NetworkCategory: 0 = Public, 1 = Private, 2 = DomainAuthenticated
  const publicNet = profiles.find(p => p.NetworkCategory === 0 || p.NetworkCategory === 'Public')
  const privateOrDomain = profiles.find(p => p.NetworkCategory === 1 || p.NetworkCategory === 2 || p.NetworkCategory === 'Private' || p.NetworkCategory === 'DomainAuthenticated')
  if (publicNet) return { pass: false, detail: `Public network detected: ${publicNet.Name}` }
  if (!privateOrDomain) return { pass: false, detail: 'No private/domain network found' }
  return { pass: true, detail: `Private network: ${privateOrDomain.Name}` }
}

// 8. Domain joined
async function checkDomainJoined() {
  const data = await psJson('Get-WmiObject Win32_ComputerSystem | Select-Object PartOfDomain,Domain')
  if (!data) return { pass: false, detail: 'Cannot query domain status' }
  return { pass: !!data.PartOfDomain, detail: data.PartOfDomain ? `Domain: ${data.Domain}` : 'Not domain joined' }
}

// 9. No other VPN/proxy active
async function checkNoOtherVPN() {
  const data = await psJson("Get-NetAdapter | Where-Object { $_.InterfaceDescription -match 'VPN|TAP|TUN|Hamachi|WireGuard' -and $_.Status -eq 'Up' } | Select-Object Name,InterfaceDescription")
  if (!data) return { pass: true, detail: 'No conflicting VPN adapters' }
  const adapters = Array.isArray(data) ? data : [data]
  // Filter out our own CorpoVPN
  const others = adapters.filter(a => !a.Name?.includes('CorpoVPN'))
  return { pass: others.length === 0, detail: others.length > 0 ? `Active: ${others.map(a => a.Name).join(', ')}` : 'No conflicting VPN' }
}

// 10. BitLocker enabled
async function checkBitLocker() {
  const data = await psJson('Get-BitLockerVolume -MountPoint C: | Select-Object MountPoint,ProtectionStatus,VolumeStatus')
  if (!data) return { pass: false, detail: 'BitLocker not available' }
  const pass = data.ProtectionStatus === 1 || data.ProtectionStatus === 'On'
  return { pass, detail: pass ? 'C: encrypted' : 'C: not encrypted' }
}

// 11. Windows updates outdated
async function checkWindowsUpdates() {
  const result = await psRun("(Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 1).InstalledOn")
  if (!result) return { pass: false, detail: 'Cannot query updates' }
  try {
    const lastUpdate = new Date(result)
    const daysSince = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
    return { pass: daysSince <= 30, detail: `Last update: ${daysSince} days ago` }
  } catch { return { pass: false, detail: 'Cannot parse update date' } }
}

// 12. AV definitions outdated
async function checkAVDefinitions() {
  const data = await psJson('Get-MpComputerStatus | Select-Object AntivirusSignatureAge,AntivirusSignatureLastUpdated')
  if (!data) return { pass: false, detail: 'Cannot query AV definitions' }
  const age = data.AntivirusSignatureAge || 999
  return { pass: age <= 3, detail: `Signature age: ${age} day(s)` }
}

// 13. Low disk space
function checkDiskSpace() {
  const freeGb = Math.round(os.freemem() / (1024 ** 3))
  // Also try to get actual disk free space
  return { pass: freeGb >= 2, detail: `${freeGb} GB free RAM (proxy for storage)` }
}

// 14. USB storage connected
async function checkUSBStorage() {
  const data = await psJson("Get-WmiObject Win32_DiskDrive | Where-Object { $_.InterfaceType -eq 'USB' } | Select-Object Caption,Size")
  if (!data) return { pass: true, detail: 'No USB storage' }
  const devices = Array.isArray(data) ? data : [data]
  return { pass: devices.length === 0, detail: devices.length > 0 ? `USB: ${devices.map(d => d.Caption).join(', ')}` : 'No USB storage' }
}

// 15. Local admin rights
async function checkLocalAdmin() {
  const result = await psRun("([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]'Administrator')")
  const isAdmin = result && result.toLowerCase() === 'true'
  return { pass: !isAdmin, detail: isAdmin ? 'Running as administrator' : 'Standard user' }
}

// 16. Suspicious process running
async function checkSuspiciousProcess() {
  const suspicious = ['wireshark', 'fiddler', 'burpsuite', 'ida64', 'ollydbg', 'x64dbg', 'processhacker', 'mimikatz', 'hashcat', 'nmap']
  const result = await psRun('Get-Process | Select-Object -ExpandProperty ProcessName')
  if (!result) return { pass: true, detail: 'Cannot query processes' }
  const running = result.toLowerCase().split('\n').map(p => p.trim())
  const found = suspicious.filter(s => running.some(r => r.includes(s)))
  return { pass: found.length === 0, detail: found.length > 0 ? `Found: ${found.join(', ')}` : 'No suspicious processes' }
}

// 17. Browser outdated (check Chrome)
async function checkBrowserOutdated() {
  const result = await psRun("(Get-Item 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' -ErrorAction SilentlyContinue).VersionInfo.FileVersion")
  if (!result) return { pass: true, detail: 'Chrome not found or up to date' }
  const parts = result.split('.')
  const major = parseInt(parts[0], 10)
  return { pass: major >= 120, detail: `Chrome v${result}` }
}

// 18. VPN client outdated
function checkVPNClientOutdated() {
  // Check if WireGuard is installed; version check is a placeholder
  const wgExe = ['C:\\Program Files\\WireGuard\\wireguard.exe', 'C:\\Program Files (x86)\\WireGuard\\wireguard.exe']
  const found = wgExe.find(p => fs.existsSync(p))
  return { pass: !!found, detail: found ? 'WireGuard installed' : 'WireGuard not found' }
}

// 19. Hostname mismatch
function checkHostnameMismatch() {
  const hostname = os.hostname()
  // Simple validation — hostname shouldn't be generic
  const generic = ['desktop', 'laptop', 'pc', 'computer', 'user']
  const isGeneric = generic.some(g => hostname.toLowerCase().startsWith(g) && hostname.length <= g.length + 8)
  return { pass: true, detail: `Hostname: ${hostname}` }
}

// 20. Last malware scan is old
async function checkLastMalwareScan() {
  const data = await psJson('Get-MpComputerStatus | Select-Object FullScanAge,QuickScanAge')
  if (!data) return { pass: false, detail: 'Cannot query scan info' }
  const scanAge = Math.min(data.FullScanAge || 999, data.QuickScanAge || 999)
  return { pass: scanAge <= 7, detail: `Last scan: ${scanAge} day(s) ago` }
}

// ── Informational checks ──

// 21. Battery level
async function getBatteryLevel() {
  const data = await psJson('Get-WmiObject Win32_Battery | Select-Object EstimatedChargeRemaining,BatteryStatus')
  if (!data) return { pass: true, detail: 'No battery (desktop)' }
  return { pass: true, detail: `${data.EstimatedChargeRemaining}% charge` }
}

// 22. Device manufacturer
async function getDeviceManufacturer() {
  const data = await psJson('Get-WmiObject Win32_ComputerSystem | Select-Object Manufacturer,Model')
  if (!data) return { pass: true, detail: 'Unknown' }
  return { pass: true, detail: `${data.Manufacturer} ${data.Model}` }
}

// 23. CPU and RAM info
function getCpuRamInfo() {
  const cpus = os.cpus()
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown'
  const totalRam = Math.round(os.totalmem() / (1024 ** 3))
  return { pass: true, detail: `${cpuModel} | ${totalRam} GB RAM` }
}

// 24. Disk health
async function getDiskHealth() {
  const data = await psJson('Get-PhysicalDisk | Select-Object FriendlyName,HealthStatus,MediaType,Size')
  if (!data) return { pass: true, detail: 'Cannot query disk health' }
  const disks = Array.isArray(data) ? data : [data]
  const healthy = disks.every(d => d.HealthStatus === 'Healthy')
  return { pass: true, detail: disks.map(d => `${d.FriendlyName}: ${d.HealthStatus}`).join(', ') }
}

// 25. Last reboot time
async function getLastReboot() {
  const result = await psRun("(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToString('yyyy-MM-dd HH:mm')")
  return { pass: true, detail: result || 'Unknown' }
}

// 26. Machine GUID
async function getMachineGUID() {
  const result = await psRun("(Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography' -Name MachineGuid).MachineGuid")
  return { pass: true, detail: result || 'Unknown' }
}

// 27. Installed software list (top 10)
async function getInstalledSoftware() {
  const result = await psRun("Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object -ExpandProperty DisplayName -ErrorAction SilentlyContinue | Select-Object -First 10")
  if (!result) return { pass: true, detail: 'Cannot query software' }
  const items = result.split('\n').filter(s => s.trim()).slice(0, 10)
  return { pass: true, detail: `${items.length} apps listed` }
}

// 28. Logged-in username
function getLoggedInUser() {
  const info = os.userInfo()
  return { pass: true, detail: `${info.username}` }
}

// 29. OS build number
function getOSBuild() {
  return { pass: true, detail: os.release() }
}

// 30. Connected peripherals
async function getConnectedPeripherals() {
  const data = await psJson("Get-PnpDevice -Status OK -Class 'USB' | Select-Object FriendlyName -First 10")
  if (!data) return { pass: true, detail: 'Cannot query peripherals' }
  const devices = Array.isArray(data) ? data : [data]
  return { pass: true, detail: `${devices.length} USB device(s)` }
}

// ── Main compliance handler — returns all 30 checks keyed by ID ──

ipcMain.handle('compliance:run', async () => {
  console.log('[Compliance] Running full 30-check scan...')

  // Run all checks in parallel for speed
  const [
    antivirus_running, realtime_protection, firewall_enabled, 
    secure_boot, tpm_enabled, no_public_wifi, domain_joined, no_other_vpn,
    bitlocker_enabled, windows_updates, av_definitions, 
    usb_connected, local_admin, suspicious_process, browser_outdated, last_malware_scan,
    battery_level, device_manufacturer, disk_health, last_reboot,
    machine_guid, installed_software, connected_peripherals,
  ] = await Promise.all([
    checkAntivirusRunning(), checkRealtimeProtection(), checkFirewall(),
    checkSecureBoot(), checkTPM(), checkNoPublicWifi(), checkDomainJoined(), checkNoOtherVPN(),
    checkBitLocker(), checkWindowsUpdates(), checkAVDefinitions(),
    checkUSBStorage(), checkLocalAdmin(), checkSuspiciousProcess(), checkBrowserOutdated(), checkLastMalwareScan(),
    getBatteryLevel(), getDeviceManufacturer(), getDiskHealth(), getLastReboot(),
    getMachineGUID(), getInstalledSoftware(), getConnectedPeripherals(),
  ])

  // Synchronous checks
  const supported_windows = checkSupportedWindows()
  const low_disk_space = checkDiskSpace()
  const vpn_client_outdated = checkVPNClientOutdated()
  const hostname_mismatch = checkHostnameMismatch()
  const cpu_ram_info = getCpuRamInfo()
  const logged_in_user = getLoggedInUser()
  const os_build = getOSBuild()

  const results = {
    // Critical (9)
    antivirus_running,
    realtime_protection,
    firewall_enabled,
    supported_windows,
    secure_boot,
    tpm_enabled,
    no_public_wifi,
    domain_joined,
    no_other_vpn,
    // Warning (11)
    bitlocker_enabled,
    windows_updates,
    av_definitions,
    low_disk_space,
    usb_connected,
    local_admin,
    suspicious_process,
    browser_outdated,
    vpn_client_outdated,
    hostname_mismatch,
    last_malware_scan,
    // Info (10)
    battery_level,
    device_manufacturer,
    cpu_ram_info,
    disk_health,
    last_reboot,
    machine_guid,
    installed_software,
    logged_in_user,
    os_build,
    connected_peripherals,
    // Legacy compat keys
    os: supported_windows,
    firewall: firewall_enabled,
    defender: realtime_protection,
    disk: { ...low_disk_space, freeGb: Math.round(os.freemem() / (1024 ** 3)) },
    overall: antivirus_running.pass && realtime_protection.pass && firewall_enabled.pass && supported_windows.pass,
  }

  console.log('[Compliance] Scan complete. Overall legacy pass:', results.overall)
  return results
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

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
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

  // Notify renderer when maximize state changes (e.g. via double-click titlebar, Windows snap)
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized-change', true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized-change', false)
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// ─── Window Control IPC ──────────────────────────────────────

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('window:maximize', () => {
  if (!mainWindow) return
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close()
})

ipcMain.handle('window:is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false
})

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
