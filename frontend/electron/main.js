const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let isQuitting = false;

// Development mode detection
const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0b',
    show: false,
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Load the Next.js app
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../out/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle window close - minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
    return true;
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function createTray() {
  // Create tray icon (use a simple icon or create one)
  const iconPath = path.join(__dirname, '../public/tray-icon.png');
  let trayIcon;
  
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      // Fallback: create a simple colored icon
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  // Resize for tray (16x16 on macOS)
  if (!trayIcon.isEmpty()) {
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Voice Agent - Cmd+Shift+V zum Aktivieren');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Voice Agent öffnen',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'Aufnahme starten (Cmd+Shift+V)',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('hotkey-triggered', 'start-recording');
      },
    },
    { type: 'separator' },
    {
      label: 'Beenden',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Click on tray icon to show window
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerGlobalShortcuts() {
  // Main hotkey: Cmd+Shift+V (Mac) or Ctrl+Shift+V (Windows/Linux)
  const registered = globalShortcut.register('CommandOrControl+Shift+V', () => {
    console.log('Hotkey triggered: CommandOrControl+Shift+V');
    
    if (!mainWindow) return;

    // Show and focus window
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    mainWindow.focus();

    // Send event to renderer to start recording
    mainWindow.webContents.send('hotkey-triggered', 'start-recording');
  });

  if (!registered) {
    console.error('Failed to register global shortcut: CommandOrControl+Shift+V');
  } else {
    console.log('Global shortcut registered: CommandOrControl+Shift+V');
  }

  // Secondary hotkey: Escape to stop recording
  globalShortcut.register('Escape', () => {
    if (mainWindow && mainWindow.isFocused()) {
      mainWindow.webContents.send('hotkey-triggered', 'stop-recording');
    }
  });

  // Hotkey to toggle window visibility
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
});

// IPC handlers for renderer communication
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    isDev,
  };
});

ipcMain.handle('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.handle('show-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

// Handle recording state from renderer
ipcMain.on('recording-state-changed', (event, state) => {
  console.log('Recording state changed:', state);
  // Could update tray icon or tooltip based on recording state
  if (tray) {
    if (state.isRecording) {
      tray.setToolTip('Voice Agent - Aufnahme läuft...');
    } else {
      tray.setToolTip('Voice Agent - Cmd+Shift+V zum Aktivieren');
    }
  }
});
