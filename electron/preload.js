const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

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
