const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hangLaApi', {
  pickImage: () => ipcRenderer.invoke('media:pick-image')
});
