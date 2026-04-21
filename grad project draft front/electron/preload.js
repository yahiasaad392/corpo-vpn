const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  // ── Window controls ──
  windowMinimize:    () => ipcRenderer.send('window:minimize'),
  windowMaximize:    () => ipcRenderer.send('window:maximize'),
  windowClose:       () => ipcRenderer.send('window:close'),
  windowIsMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (callback) => {
    const handler = (_event, isMaximized) => callback(isMaximized)
    ipcRenderer.on('window:maximized-change', handler)
    // Return cleanup function
    return () => ipcRenderer.removeListener('window:maximized-change', handler)
  },

  // Compliance checks
  runComplianceCheck: () => ipcRenderer.invoke('compliance:run'),

  // WireGuard VPN
  vpnConnect:    (config) => ipcRenderer.invoke('vpn:connect', config),
  vpnDisconnect: ()       => ipcRenderer.invoke('vpn:disconnect'),
  vpnStatus:     ()       => ipcRenderer.invoke('vpn:status'),
  vpnSaveConfig: (config) => ipcRenderer.invoke('vpn:save-config', config),
  vpnLoadConfig: ()       => ipcRenderer.invoke('vpn:load-config'),
  vpnDiagnose:   ()       => ipcRenderer.invoke('vpn:diagnose'),
})
