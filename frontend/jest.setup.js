// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock window.electronAPI for tests
global.window = global.window || {};
global.window.electronAPI = {
  isElectron: false,
  requestMicrophonePermission: jest.fn().mockResolvedValue({ granted: true }),
};

// Mock MediaRecorder
global.MediaRecorder = jest.fn().mockImplementation(() => {
  const chunks = [];
  const recorder = {
    start: jest.fn((timeslice) => {
      recorder.state = 'recording';
      // Simulate periodic data available events
      const interval = setInterval(() => {
        if (recorder.state === 'recording' && recorder.ondataavailable) {
          const blob = new Blob(['chunk'], { type: 'audio/webm' });
          Object.defineProperty(blob, 'size', { value: 100, writable: false });
          chunks.push(blob);
          recorder.ondataavailable({ data: blob });
        } else {
          clearInterval(interval);
        }
      }, timeslice || 1000);
    }),
    stop: jest.fn(() => {
      recorder.state = 'inactive';
      // Simulate stop event - onstop will be called synchronously
      if (recorder.onstop) {
        // Use setTimeout to make it async like real MediaRecorder
        setTimeout(() => {
          recorder.onstop();
        }, 0);
      }
    }),
    pause: jest.fn(() => {
      recorder.state = 'paused';
    }),
    resume: jest.fn(() => {
      recorder.state = 'recording';
    }),
    ondataavailable: null,
    onstop: null,
    state: 'inactive',
  };
  return recorder;
});

global.MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);

// Mock navigator.mediaDevices
global.navigator.mediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: () => [
      {
        stop: jest.fn(),
      },
    ],
  }),
};

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn((blob) => `blob:${blob.type}`);
global.URL.revokeObjectURL = jest.fn();

// Mock Audio
global.Audio = jest.fn().mockImplementation(() => ({
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  volume: 0.6,
}));
