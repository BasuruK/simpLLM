import { autoUpdater } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import log from 'electron-log';

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Configure auto-updater for private GitHub repository
export function setupAutoUpdater(mainWindow: BrowserWindow | null) {
  // Set update check interval (check every 5 minutes)
  const CHECK_INTERVAL = 5 * 60 * 1000;
  
  // Configure auto-updater for private repository
  autoUpdater.autoDownload = false; // Don't auto-download, wait for user confirmation
  autoUpdater.autoInstallOnAppQuit = true;
  
  // For private GitHub repos, set the token
  // The token should be embedded during build or fetched securely
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'BasuruK',
    repo: 'simpLLM',
    private: true,
    token: process.env.GH_TOKEN || '', // Token will be set at build time
  });

  // Event: Checking for update
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
  });

  // Event: Update available
  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Send update available notification to renderer
      mainWindow.webContents.send('update-available', {
        version: info.version,
        releaseNotes: info.releaseNotes,
        releaseName: info.releaseName,
        releaseDate: info.releaseDate,
      });
    }
  });

  // Event: Update not available
  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
  });

  // Event: Download progress
  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Send download progress to renderer
      mainWindow.webContents.send('download-progress', {
        percent: progressObj.percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total,
      });
    }
  });

  // Event: Update downloaded
  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      // Send update downloaded notification to renderer
      mainWindow.webContents.send('update-downloaded', {
        version: info.version,
      });
    }
  });

  // Event: Error
  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', {
        message: err.message,
      });
    }
  });

  // Check for updates on startup (after 3 seconds delay)
  setTimeout(() => {
    checkForUpdates();
  }, 3000);

  // Check for updates periodically
  setInterval(() => {
    checkForUpdates();
  }, CHECK_INTERVAL);
}

// Function to check for updates
export function checkForUpdates() {
  // Only check for updates in production
  if (process.env.NODE_ENV !== 'development') {
    log.info('Manually checking for updates...');
    autoUpdater.checkForUpdates().catch((err) => {
      log.error('Failed to check for updates:', err);
    });
  } else {
    log.info('Skipping update check in development mode');
  }
}

// Function to download update
export function downloadUpdate() {
  log.info('Starting update download...');
  autoUpdater.downloadUpdate().catch((err) => {
    log.error('Failed to download update:', err);
  });
}

// Function to quit and install update
export function quitAndInstall() {
  log.info('Quitting and installing update...');
  autoUpdater.quitAndInstall(false, true);
}
