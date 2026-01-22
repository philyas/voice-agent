const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Get app information
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // Window controls
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  showWindow: () => ipcRenderer.invoke('show-window'),
  
  // Recording state
  notifyRecordingState: (state) => ipcRenderer.send('recording-state-changed', state),
  
  // Hotkey event listeners
  onHotkeyTriggered: (callback) => {
    const listener = (event, action) => callback(action);
    ipcRenderer.on('hotkey-triggered', listener);
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('hotkey-triggered', listener);
    };
  },
  
  // Check if running in Electron
  isElectron: true,
  
  // Platform info
  platform: process.platform,
  
  // Request microphone permission
  requestMicrophonePermission: () => ipcRenderer.invoke('request-microphone-permission'),
  
  // Open system preferences
  openSystemPreferences: () => ipcRenderer.invoke('open-system-preferences'),
});

// Log that preload script has loaded
console.log('Electron preload script loaded');
