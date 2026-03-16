const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleOverlay: () => ipcRenderer.invoke('overlay:toggle'),
  getOverlayState: () => ipcRenderer.invoke('overlay:get'),
  setOverlayOpacity: (percent) => ipcRenderer.invoke('overlay:set-opacity', percent),
  notifyTimerFinished: (mode) => ipcRenderer.invoke('timer:finished', mode),
  playSystemSound: (name) => ipcRenderer.invoke('play-system-sound', name),
});

