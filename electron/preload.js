const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  // Compliance checks - triggers real system queries
  runComplianceCheck: () => ipcRenderer.invoke('compliance:run'),
})
