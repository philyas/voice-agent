import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioRecorder } from '../useAudioRecorder';

// Mock the constants
jest.mock('@/lib/constants', () => ({
  RECORDING_SOUNDS: {
    START: '/assets/audio/start_recording_fx.mp3',
    STOP: '/assets/audio/stop_recording_fx.mp3',
  },
}));

describe('useAudioRecorder', () => {
  // Suppress expected console outputs in tests
  const originalError = console.error;
  const originalLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Suppress console.error and console.log for cleaner test output
    console.error = jest.fn();
    console.log = jest.fn();
    
    // Reset getUserMedia mock to success
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
      getTracks: () => [
        {
          stop: jest.fn(),
        },
      ],
    });
    
    // Reset electronAPI
    (window as any).electronAPI = {
      isElectron: false,
      requestMicrophonePermission: jest.fn().mockResolvedValue({ granted: true }),
    };
  });

  afterAll(() => {
    // Restore original console methods
    console.error = originalError;
    console.log = originalLog;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAudioRecorder());

    expect(result.current.isRecording).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.duration).toBe(0);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioUrl).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should start recording successfully', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.duration).toBe(0);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  });

  it('should increment duration while recording', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    // Advance timers in act to avoid warnings
    for (let i = 0; i < 3; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    expect(result.current.duration).toBe(3);
  });

  it('should stop recording', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      result.current.stopRecording();
      // Flush all pending timers
      jest.runAllTimers();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.isRecording).toBe(false);
    });
  });

  it('should pause and resume recording', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    // Advance timers in act
    for (let i = 0; i < 2; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    act(() => {
      result.current.pauseRecording();
    });

    expect(result.current.isPaused).toBe(true);
    const pausedDuration = result.current.duration;

    // Duration should not change while paused
    for (let i = 0; i < 2; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    expect(result.current.duration).toBe(pausedDuration);

    act(() => {
      result.current.resumeRecording();
    });

    expect(result.current.isPaused).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.duration).toBe(pausedDuration + 1);
  });

  it('should reset recording', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    // Advance timers to generate some chunks
    for (let i = 0; i < 2; i++) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }

    await act(async () => {
      result.current.stopRecording();
      // Flush all pending timers and promises
      jest.runAllTimers();
      await Promise.resolve();
    });

    // Wait for blob to be created
    await waitFor(() => {
      expect(result.current.audioBlob).not.toBeNull();
    });

    act(() => {
      result.current.resetRecording();
    });

    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioUrl).toBeNull();
    expect(result.current.duration).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should handle microphone permission denied', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    // Mock permission denied
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(
      new DOMException('Permission denied', 'NotAllowedError')
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toContain('Mikrofon-Zugriff wurde verweigert');
    expect(result.current.isRecording).toBe(false);
  });

  it('should handle no microphone found', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    (navigator.mediaDevices.getUserMedia as jest.Mock).mockRejectedValue(
      new DOMException('No device', 'NotFoundError')
    );

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toContain('Kein Mikrofon gefunden');
  });

  it('should handle Electron microphone permission', async () => {
    // Mock Electron API
    (window as any).electronAPI = {
      isElectron: true,
      requestMicrophonePermission: jest.fn().mockResolvedValue({ granted: true }),
    };
    
    // Ensure getUserMedia succeeds
    (navigator.mediaDevices.getUserMedia as jest.Mock).mockResolvedValue({
      getTracks: () => [
        {
          stop: jest.fn(),
        },
      ],
    });

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect((window as any).electronAPI.requestMicrophonePermission).toHaveBeenCalled();
    expect(result.current.isRecording).toBe(true);
  });

  it('should handle Electron permission denied', async () => {
    (window as any).electronAPI = {
      isElectron: true,
      requestMicrophonePermission: jest.fn().mockResolvedValue({ granted: false }),
    };

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.error).toContain('Mikrofon-Zugriff wurde verweigert');
    expect(result.current.isRecording).toBe(false);
  });
});
