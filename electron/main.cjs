// Jarvis Electron shell - Windows desktop wrapper
// Loads the Lovable-hosted frontend and exposes a window to your local Python backend.
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ---- CONFIG ---------------------------------------------------------------
// The hosted frontend URL. Update after you publish on Lovable, or override
// at runtime via the JARVIS_URL environment variable.
const DEFAULT_URL =
  process.env.JARVIS_URL ||
  'https://id-preview--b6793667-0201-4469-b818-b2d80db6ad7e.lovable.app';

// Optional: path to a locally bundled build (file://) if you ever ship one.
const LOCAL_INDEX = path.join(__dirname, '..', 'dist', 'index.html');
// --------------------------------------------------------------------------

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#05060a',
    title: 'Jarvis',
    autoHideMenuBar: true,
    frame: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  Menu.setApplicationMenu(null);

  const target = fs.existsSync(LOCAL_INDEX)
    ? `file://${LOCAL_INDEX}`
    : DEFAULT_URL;

  mainWindow.loadURL(target);

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open external links in the user's browser instead of inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Convenience: F12 toggles devtools, Ctrl+R reloads.
  mainWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'F12') mainWindow.webContents.toggleDevTools();
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r')
      mainWindow.reload();
  });
}

// IPC bridge so the renderer can ask Electron to ping the Python backend.
ipcMain.handle('jarvis:backend-url', () => {
  return process.env.JARVIS_BACKEND_URL || 'http://127.0.0.1:5005';
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
