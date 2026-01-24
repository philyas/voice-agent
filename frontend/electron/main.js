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
      // Disable webSecurity only for file:// protocol in production
      // This allows loading local files without CORS issues
      webSecurity: isDev, // Keep webSecurity enabled in dev, disable in production for file://
      allowRunningInsecureContent: false,
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
  let startUrl;
  if (isDev) {
    startUrl = 'http://localhost:3000';
  } else {
    // In production, find the correct path to the out folder
    // When packaged with electron-builder, files are in app.asar or Resources
    let indexPath;
    const fs = require('fs');
    
    // Try multiple possible locations
    const appPath = app.getAppPath();
    const resourcesPath = process.resourcesPath || appPath;
    
    // In electron-builder, the structure is:
    // - app.asar contains the main code
    // - out/ folder should be in the same directory as app.asar
    // Possible locations for the out folder
    const possiblePaths = [
      path.join(appPath, 'out', 'index.html'),                    // Standard location (unpacked)
      path.join(resourcesPath, 'app', 'out', 'index.html'),      // Packaged app location (app.asar)
      path.join(resourcesPath, 'out', 'index.html'),             // Alternative packaged location
      path.join(path.dirname(appPath), 'out', 'index.html'),     // Parent of app.asar
      path.join(__dirname, '..', 'out', 'index.html'),           // Relative to main.js
      path.join(__dirname, 'out', 'index.html'),                 // Same directory as main.js
    ];
    
    // Find the first existing path
    for (const possiblePath of possiblePaths) {
      try {
        if (fs.existsSync(possiblePath)) {
          indexPath = possiblePath;
          console.log('Found index.html at:', indexPath);
          break;
        }
      } catch (err) {
        console.error('Error checking path:', possiblePath, err);
      }
    }
    
    if (!indexPath) {
      console.error('Could not find index.html. Tried paths:');
      possiblePaths.forEach(p => {
        try {
          const exists = fs.existsSync(p);
          console.error(`  - ${p} (exists: ${exists})`);
        } catch (err) {
          console.error(`  - ${p} (error: ${err.message})`);
        }
      });
      // Fallback: use appPath/out/index.html
      indexPath = path.join(appPath, 'out', 'index.html');
      console.error('Using fallback path:', indexPath);
    }
    
    // Convert to file:// URL (must use path.normalize and replace backslashes on Windows)
    try {
      const resolvedPath = path.resolve(indexPath);
      startUrl = `file://${resolvedPath.replace(/\\/g, '/')}`;
    } catch (err) {
      console.error('Error resolving path:', err);
      // Last resort fallback
      startUrl = `file://${indexPath.replace(/\\/g, '/')}`;
    }
  }
  
  console.log('Loading URL:', startUrl);
  console.log('isDev:', isDev);
  console.log('app.isPackaged:', app.isPackaged);
  console.log('app.getAppPath():', app.getAppPath());
  console.log('__dirname:', __dirname);
  
  mainWindow.loadURL(startUrl);

  // Error handling
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL);
    console.error('Error code:', errorCode);
    console.error('Error description:', errorDescription);
    
    // Only show window and open DevTools if window is still valid
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.webContents.openDevTools();
      
      // Display error message in the window - only after page is ready
      mainWindow.webContents.once('did-finish-load', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.executeJavaScript(`
            (function() {
              try {
                document.body.innerHTML = '<div style="padding: 20px; font-family: system-ui; color: white; background: #1a1a1a; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <h1 style="color: #ff4444;">Fehler beim Laden der App</h1>
                  <p>URL: ${validatedURL}</p>
                  <p>Fehler: ${errorDescription} (Code: ${errorCode})</p>
                  <p style="margin-top: 20px; font-size: 12px; opacity: 0.7;">Bitte öffnen Sie die Entwicklertools (Cmd+Option+I) für weitere Details.</p>
                </div>';
              } catch(e) {
                console.error('Error setting error message:', e);
              }
            })();
          `).catch(err => console.error('Error displaying error message:', err));
        }
      });
    }
  });
  
  // Additional error handlers
  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[Renderer ${level}]:`, message);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully');
    // Inject a base tag if it doesn't exist (helps with relative paths in file:// protocol)
    // Only do this if window is still valid and not destroyed
    if (!isDev && mainWindow && !mainWindow.isDestroyed()) {
      // Use setTimeout to ensure DOM is fully ready
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.executeJavaScript(`
            (function() {
              try {
                if (!document.querySelector('base')) {
                  const base = document.createElement('base');
                  base.href = window.location.href.split('/').slice(0, -1).join('/') + '/';
                  document.head.insertBefore(base, document.head.firstChild);
                }
              } catch(e) {
                console.error('Error injecting base tag:', e);
              }
            })();
          `).catch(err => console.error('Error injecting base tag:', err));
        }
      }, 100);
    }
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  
  // Fallback: Show window after 3 seconds even if ready-to-show doesn't fire
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.log('Fallback: Showing window after timeout');
      mainWindow.show();
      if (!isDev) {
        mainWindow.webContents.openDevTools(); // Open DevTools for debugging
      }
    }
  }, 3000);

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
  try {
    const { session } = require('electron');
    
    // Handle permission requests (for getUserMedia, etc.)
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
      try {
        console.log('Permission requested:', permission, 'from:', details.requestingUrl);
        const allowedPermissions = ['microphone', 'camera', 'media'];
        
        if (allowedPermissions.includes(permission)) {
          console.log('Granting permission:', permission);
          callback(true); // Grant permission
        } else {
          console.log('Denying permission:', permission);
          callback(false); // Deny permission
        }
      } catch (err) {
        console.error('Error in permission request handler:', err);
        callback(false);
      }
    });

    // Handle permission checks
    session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
      try {
        const allowedPermissions = ['microphone', 'camera', 'media'];
        
        if (allowedPermissions.includes(permission)) {
          console.log('Permission check allowed:', permission, 'for:', requestingOrigin);
          return true; // Allow permission check
        }
        return false;
      } catch (err) {
        console.error('Error in permission check handler:', err);
        return false;
      }
    });

    // On macOS, request system-level media access (async, don't block)
    if (process.platform === 'darwin') {
      try {
        // Check current status first
        const status = systemPreferences.getMediaAccessStatus('microphone');
        console.log('Current microphone access status:', status);
        
        if (status !== 'granted') {
          // Request microphone access (async, don't block)
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
      } catch (err) {
        console.error('Error checking microphone access status:', err);
      }
    }
  } catch (err) {
    console.error('Error setting up permissions:', err);
    // Don't throw - continue with app initialization
  }
}

// App lifecycle
app.whenReady().then(() => {
  try {
    setupPermissions();
    createWindow();
    createTray();
    registerGlobalShortcuts();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (error) {
    console.error('Error during app initialization:', error);
    app.quit();
  }
}).catch((error) => {
  console.error('Error in app.whenReady():', error);
  app.quit();
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
