import * as path from "path";

import { app, BrowserWindow, shell, ipcMain, Menu } from "electron";
import serve from "electron-serve";

import {
  setupAutoUpdater,
  checkForUpdates,
  downloadUpdate,
  quitAndInstall,
} from "./auto-updater";

let mainWindow: BrowserWindow | null = null;

// Setup electron-serve to serve the out directory
const loadURL = serve({ directory: "out" });

// Check if running in development mode
const isDev = process.env.NODE_ENV === "development";

// Disable Autofill features to avoid unsupported DevTools commands noise in Electron
app.commandLine.appendSwitch(
  "disable-features",
  "AutofillServerCommunication,AutofillAssistantChromeIntegration",
);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, "..", "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: isDev, // Only enable DevTools in development
    },
    backgroundColor: "#000000",
    show: false,
  });

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [
            isDev
              ? // Development: Allow Next.js dev server and hot reload
                "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data: blob:; " +
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
                "style-src 'self' 'unsafe-inline' http://localhost:*; " +
                "img-src 'self' data: blob: http://localhost:* https://robohash.org; " +
                "font-src 'self' data:; " +
                "connect-src 'self' http://localhost:* ws://localhost:* https://api.openai.com;"
              : // Production: Strict CSP
                "default-src 'self'; " +
                "script-src 'self'; " +
                "style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: blob: https://robohash.org; " +
                "font-src 'self' data:; " +
                "connect-src 'self' https://api.openai.com;",
          ],
        },
      });
    },
  );

  // Bypass CORS for OpenAI API (Electron desktop app only)
  mainWindow.webContents.session.webRequest.onHeadersReceived(
    { urls: ["https://api.openai.com/*"] },
    (details, callback) => {
      const responseHeaders = { ...details.responseHeaders };

      // Get existing allowed headers from upstream
      const existingHeaders = responseHeaders["access-control-allow-headers"];
      const existingHeadersStr = existingHeaders ? existingHeaders.join(", ") : "";
      
      // Required headers for OpenAI API
      const requiredHeaders = [
        "Authorization", 
        "Content-Type", 
        "OpenAI-Organization",
        "OpenAI-Project"
      ];
      
      // Merge existing headers with required ones, avoiding duplicates
      const allHeaders = existingHeadersStr 
        ? [...existingHeadersStr.split(",").map(h => h.trim()), ...requiredHeaders]
        : requiredHeaders;
      const uniqueHeaders = [...new Set(allHeaders)];

      // Delete existing CORS headers to prevent duplicates (except allow-headers)
      delete responseHeaders["access-control-allow-origin"];
      delete responseHeaders["access-control-allow-methods"];
      delete responseHeaders["access-control-allow-credentials"];

      // Set new CORS headers
      responseHeaders["Access-Control-Allow-Origin"] = ["*"];
      responseHeaders["Access-Control-Allow-Methods"] = [
        "GET, POST, PUT, DELETE, OPTIONS",
      ];
      responseHeaders["Access-Control-Allow-Headers"] = [uniqueHeaders.join(", ")];

      callback({ responseHeaders });
    },
  );

  // Remove menu bar in production
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // In development, load from Next.js dev server
  // In production, use electron-serve
  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    // Open DevTools in development
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    // electron-serve will handle all the path resolution
    loadURL(mainWindow);
  }

  // Show window when ready to prevent flickering
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);

    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Setup IPC handlers for auto-updater
  ipcMain.handle("check-for-updates", () => {
    checkForUpdates();
  });

  ipcMain.handle("download-update", () => {
    downloadUpdate();
  });

  ipcMain.handle("install-update", () => {
    quitAndInstall();
  });

  // Initialize auto-updater in production only
  if (!isDev) {
    setupAutoUpdater(mainWindow);
  }

  app.on("activate", () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Security: Prevent navigation to external URLs
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    if (isDev && parsedUrl.origin === "http://localhost:3000") {
      return;
    }

    if (parsedUrl.protocol === "file:") {
      return;
    }

    event.preventDefault();
  });
});
