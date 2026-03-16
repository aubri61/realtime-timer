const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleOverlay: () => ipcRenderer.invoke('overlay:toggle'),
  getOverlayState: () => ipcRenderer.invoke('overlay:get'),
  notifyTimerFinished: (mode) => ipcRenderer.invoke('timer:finished', mode),
});

