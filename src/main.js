const { app, BrowserWindow, dialog, ipcMain, shell, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const PROJECT_REPOSITORY_URL = 'https://github.com/wilsonwu/hang-la';
const APP_DISPLAY_NAME = '夯到拉排序器';
const APP_ABOUT_CREDITS = `一个“夯到拉”桌面排序工具。\nGitHub: ${PROJECT_REPOSITORY_URL}`;

function getMacAppIconPath() {
  if (process.platform !== 'darwin') {
    return null;
  }

  return app.isPackaged
    ? path.join(process.resourcesPath, 'icon.icns')
    : path.join(app.getAppPath(), 'build', 'icon.png');
}

function applyMacAppIcon() {
  if (process.platform !== 'darwin' || typeof app.dock?.setIcon !== 'function') {
    return;
  }

  const iconPath = getMacAppIconPath();
  if (!iconPath) {
    return;
  }

  const dockIcon = nativeImage.createFromPath(iconPath);

  if (dockIcon.isEmpty()) {
    console.warn('[main] failed to load mac app icon', { iconPath });
    return;
  }

  app.dock.setIcon(dockIcon);
}

function configureMacAboutPanel() {
  if (process.platform !== 'darwin' || typeof app.setAboutPanelOptions !== 'function') {
    return;
  }

  app.setAboutPanelOptions({
    applicationName: APP_DISPLAY_NAME,
    applicationVersion: app.getVersion(),
    credits: APP_ABOUT_CREDITS
  });
}

function broadcastFullscreenState(window) {
  if (!window || window.isDestroyed()) {
    return;
  }

  window.webContents.send('window:fullscreen-changed', window.isFullScreen());
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1120,
    minHeight: 760,
    show: false,
    backgroundColor: '#d1d1d1',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  window.webContents.on('did-finish-load', () => {
    broadcastFullscreenState(window);
    if (!window.isVisible()) {
      window.show();
    }
  });

  window.on('enter-full-screen', () => {
    broadcastFullscreenState(window);
  });

  window.on('leave-full-screen', () => {
    broadcastFullscreenState(window);
  });

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    console.error('[main] did-fail-load', { errorCode, errorDescription, validatedUrl });
  });

  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] render-process-gone', details);
  });

  window.loadFile(path.join(__dirname, 'renderer', 'index.html')).catch((error) => {
    console.error('[main] loadFile failed', error);
  });
}

app.whenReady().then(() => {
  applyMacAppIcon();
  configureMacAboutPanel();

  ipcMain.handle('media:pick-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        {
          name: 'Images',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']
        }
      ]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    const fileBuffer = await fs.readFile(selectedPath);
    const extension = path.extname(selectedPath).slice(1).toLowerCase() || 'png';
    const mimeType = extension === 'svg' ? 'image/svg+xml' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;

    return {
      name: path.basename(selectedPath),
      dataUrl: `data:${mimeType};base64,${fileBuffer.toString('base64')}`
    };
  });

  ipcMain.handle('window:toggle-fullscreen', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return false;
    }

    const nextState = !window.isFullScreen();
    window.setFullScreen(nextState);
    return nextState;
  });

  ipcMain.handle('window:get-fullscreen-state', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) {
      return false;
    }

    return window.isFullScreen();
  });

  ipcMain.handle('shell:open-project-repository', async () => {
    await shell.openExternal(PROJECT_REPOSITORY_URL);
    return true;
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
