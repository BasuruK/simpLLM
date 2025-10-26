import { app, BrowserWindow, shell, ipcMain } from 'electron';
import * as path from 'path';
import serve from 'electron-serve';
import { setupAutoUpdater, checkForUpdates, downloadUpdate, quitAndInstall } from './auto-updater';

let mainWindow: BrowserWindow | null = null;

// Setup electron-serve to serve the out directory
const loadURL = serve({ directory: 'out' });

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#000000',
    show: false,
  });

  // In development, load from Next.js dev server
  // In production, use electron-serve
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    // electron-serve will handle all the path resolution
    loadURL(mainWindow);
  }

  // Show window when ready to prevent flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Setup IPC handlers for auto-updater
  ipcMain.handle('check-for-updates', () => {
    checkForUpdates();
  });

  ipcMain.handle('download-update', () => {
    downloadUpdate();
  });

  ipcMain.handle('install-update', () => {
    quitAndInstall();
  });

  // Initialize auto-updater
  setupAutoUpdater(mainWindow);

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev && parsedUrl.origin === 'http://localhost:3000') {
      return;
    }
    
    if (parsedUrl.protocol === 'file:') {
      return;
    }
    
    event.preventDefault();
  });
});
