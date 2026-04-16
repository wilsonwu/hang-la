const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

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
    console.log('[main] ready-to-show');
    window.show();
  });

  window.webContents.on('did-finish-load', async () => {
    console.log('[main] did-finish-load', window.webContents.getURL());

    try {
      const renderSummary = await window.webContents.executeJavaScript(
        `(() => ({
          title: document.title,
          bodyChildren: document.body.children.length,
          boardExists: Boolean(document.getElementById('board')),
          laneCount: document.querySelectorAll('.lane').length,
          bodyText: document.body.innerText.slice(0, 120)
        }))()`
      );
      console.log('[main] render-summary', renderSummary);
    } catch (error) {
      console.error('[main] render-summary failed', error);
    }

    if (!window.isVisible()) {
      console.log('[main] showing window from did-finish-load fallback');
      window.show();
    }
  });

  window.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl) => {
    console.error('[main] did-fail-load', { errorCode, errorDescription, validatedUrl });
  });

  window.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] render-process-gone', details);
  });

  window.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      console.error('[renderer]', { sourceId, line, message });
      return;
    }

    console.log('[renderer]', { sourceId, line, message });
  });

  window.loadFile(path.join(__dirname, 'renderer', 'index.html')).catch((error) => {
    console.error('[main] loadFile failed', error);
  });
}

app.whenReady().then(() => {
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
