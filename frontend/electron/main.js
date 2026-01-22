const { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, systemPreferences } = require('electron');
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
      // Enable media access
      enableBlinkFeatures: 'MediaDevices',
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0a0a0b',
    show: false,
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Setup permissions for this specific window
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
    console.log('Window-specific permission requested:', permission, 'from:', details.requestingUrl);
    const allowedPermissions = ['microphone', 'camera', 'media'];
    
    if (allowedPermissions.includes(permission)) {
      console.log('Granting window permission:', permission);
      callback(true);
    } else {
      callback(false);
    }
  });

  mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    const allowedPermissions = ['microphone', 'camera', 'media'];
    
    if (allowedPermissions.includes(permission)) {
      console.log('Window permission check allowed:', permission);
      return true;
    }
    return false;
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
  tray.setToolTip('EverlastAI - Audio Intelligence - Cmd+Shift+V zum Aktivieren');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'EverlastAI - Audio Intelligence öffnen',
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

// Setup permissions for media access
function setupPermissions() {
  const { session } = require('electron');
  
  // Handle permission requests (for getUserMedia, etc.)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    console.log('Permission requested:', permission, 'from:', details.requestingUrl);
    const allowedPermissions = ['microphone', 'camera', 'media'];
    
    if (allowedPermissions.includes(permission)) {
      console.log('Granting permission:', permission);
      callback(true); // Grant permission
    } else {
      console.log('Denying permission:', permission);
      callback(false); // Deny permission
    }
  });

  // Handle permission checks
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    const allowedPermissions = ['microphone', 'camera', 'media'];
    
    if (allowedPermissions.includes(permission)) {
      console.log('Permission check allowed:', permission, 'for:', requestingOrigin);
      return true; // Allow permission check
    }
    return false;
  });

  // On macOS, request system-level media access (async, don't block)
  if (process.platform === 'darwin') {
    // Check current status first
    const status = systemPreferences.getMediaAccessStatus('microphone');
    console.log('Current microphone access status:', status);
    
    if (status !== 'granted') {
      // Request microphone access
      systemPreferences.askForMediaAccess('microphone').then((granted) => {
        if (granted) {
          console.log('Microphone access granted by system');
        } else {
          console.warn('Microphone access denied by system');
        }
      }).catch((err) => {
        console.error('Error requesting microphone access:', err);
      });
    } else {
      console.log('Microphone access already granted');
    }
  }
}

// App lifecycle
app.whenReady().then(() => {
  setupPermissions();
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

// Handle microphone permission request from renderer
ipcMain.handle('request-microphone-permission', async () => {
  if (process.platform === 'darwin') {
    try {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      if (status === 'granted') {
        return { granted: true, status: 'already-granted' };
      }
      
      const granted = await systemPreferences.askForMediaAccess('microphone');
      return { granted, status: granted ? 'granted' : 'denied' };
    } catch (err) {
      console.error('Error requesting microphone permission:', err);
      return { granted: false, status: 'error', error: err.message };
    }
  }
  // For non-macOS platforms, permissions are handled via session handlers
  return { granted: true, status: 'handled-by-session' };
});

// Open system preferences for microphone access
ipcMain.handle('open-system-preferences', async () => {
  if (process.platform === 'darwin') {
    try {
      // Open System Preferences to Privacy & Security > Microphone
      const { exec } = require('child_process');
      exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"', (error) => {
        if (error) {
          console.error('Error opening system preferences:', error);
          // Fallback: open general system preferences
          exec('open /System/Library/PreferencePanes/Security.prefPane');
        }
      });
      return { success: true };
    } catch (err) {
      console.error('Error opening system preferences:', err);
      return { success: false, error: err.message };
    }
  }
  // For Windows/Linux, provide instructions
  return { success: false, message: 'Bitte öffnen Sie die Systemeinstellungen manuell' };
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
      tray.setToolTip('EverlastAI - Audio Intelligence - Aufnahme läuft...');
    } else {
      tray.setToolTip('EverlastAI - Audio Intelligence - Cmd+Shift+V zum Aktivieren');
    }
  }
});
