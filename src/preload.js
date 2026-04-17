const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hangLaApi', {
  pickImage: () => ipcRenderer.invoke('media:pick-image'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggle-fullscreen'),
  getFullscreenState: () => ipcRenderer.invoke('window:get-fullscreen-state'),
  openProjectRepository: () => ipcRenderer.invoke('shell:open-project-repository'),
  onFullscreenChanged: (callback) => {
    const listener = (_event, isFullscreen) => callback(isFullscreen);
    ipcRenderer.on('window:fullscreen-changed', listener);

    return () => {
      ipcRenderer.removeListener('window:fullscreen-changed', listener);
    };
  }
});
