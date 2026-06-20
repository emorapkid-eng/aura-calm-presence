const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvis', {
  // Renderer can call: await window.jarvis.getBackendUrl()
  getBackendUrl: () => ipcRenderer.invoke('jarvis:backend-url'),
  platform: process.platform,
  isElectron: true,
});
