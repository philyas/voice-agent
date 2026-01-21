'use client';

import { Mic, Square, Pause, Play } from 'lucide-react';

interface RecordButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  disabled?: boolean;
}

export function RecordButton({
  isRecording,
  isPaused,
  onStart,
  onStop,
  onPause,
  onResume,
  disabled = false,
}: RecordButtonProps) {
  if (!isRecording) {
    return (
      <button
        onClick={onStart}
        disabled={disabled}
        className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center"
        aria-label="Aufnahme starten"
      >
        <Mic className="w-8 h-8" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {/* Pause/Resume Button */}
      <button
        onClick={isPaused ? onResume : onPause}
        className="w-14 h-14 rounded-full bg-gray-700 text-white shadow-md hover:bg-gray-600 transition-all duration-200 flex items-center justify-center"
        aria-label={isPaused ? 'Fortsetzen' : 'Pausieren'}
      >
        {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
      </button>

      {/* Recording indicator */}
      <div className="relative">
        <button
          onClick={onStop}
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg flex items-center justify-center recording-pulse"
          aria-label="Aufnahme stoppen"
        >
          <Square className="w-6 h-6 fill-current" />
        </button>
        
        {/* Waveform visualization */}
        {!isPaused && (
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-end gap-1 h-6">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-red-500 rounded-full waveform-bar"
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Spacer to balance the layout */}
      <div className="w-14 h-14" />
    </div>
  );
}
