'use client';

import { useEffect, useState, useCallback } from 'react';

interface ElectronAPI {
  getAppInfo: () => Promise<{
    version: string;
    platform: string;
    isDev: boolean;
  }>;
  minimizeToTray: () => Promise<void>;
  showWindow: () => Promise<void>;
  notifyRecordingState: (state: { isRecording: boolean }) => void;
  onHotkeyTriggered: (callback: (action: string) => void) => () => void;
  requestMicrophonePermission: () => Promise<{ granted: boolean; status: string; error?: string }>;
  openSystemPreferences: () => Promise<{ success: boolean; error?: string; message?: string }>;
  isElectron: boolean;
  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

interface UseElectronReturn {
  isElectron: boolean;
  platform: string | null;
  appInfo: { version: string; platform: string; isDev: boolean } | null;
  minimizeToTray: () => void;
  notifyRecordingState: (isRecording: boolean) => void;
  openSystemPreferences: () => Promise<void>;
}

export function useElectron(): UseElectronReturn {
  const [isElectron, setIsElectron] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);
  const [appInfo, setAppInfo] = useState<{ version: string; platform: string; isDev: boolean } | null>(null);

  useEffect(() => {
    // Check if running in Electron
    const electronAPI = window.electronAPI;
    if (electronAPI?.isElectron) {
      setIsElectron(true);
      setPlatform(electronAPI.platform);
      
      // Get app info
      electronAPI.getAppInfo().then(setAppInfo).catch(console.error);
    }
  }, []);

  const minimizeToTray = useCallback(() => {
    if (window.electronAPI?.isElectron) {
      window.electronAPI.minimizeToTray();
    }
  }, []);

  const notifyRecordingState = useCallback((isRecording: boolean) => {
    if (window.electronAPI?.isElectron) {
      window.electronAPI.notifyRecordingState({ isRecording });
    }
  }, []);

  const openSystemPreferences = useCallback(async () => {
    if (window.electronAPI?.isElectron && window.electronAPI.openSystemPreferences) {
      try {
        await window.electronAPI.openSystemPreferences();
      } catch (error) {
        console.error('Error opening system preferences:', error);
      }
    }
  }, []);

  return {
    isElectron,
    platform,
    appInfo,
    minimizeToTray,
    notifyRecordingState,
    openSystemPreferences,
  };
}

// Hook to listen for hotkey events
export function useHotkeyListener(
  onStartRecording: () => void,
  onStopRecording: () => void
): void {
  useEffect(() => {
    const electronAPI = window.electronAPI;
    if (!electronAPI?.isElectron) return;

    const cleanup = electronAPI.onHotkeyTriggered((action) => {
      console.log('Hotkey action received:', action);
      
      switch (action) {
        case 'start-recording':
          onStartRecording();
          break;
        case 'stop-recording':
          onStopRecording();
          break;
        default:
          console.log('Unknown hotkey action:', action);
      }
    });

    return cleanup;
  }, [onStartRecording, onStopRecording]);
}
