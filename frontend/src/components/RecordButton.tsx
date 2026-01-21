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
        className="group relative w-24 h-24 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 text-dark-950 shadow-gold-lg hover:shadow-gold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center btn-shine"
        aria-label="Aufnahme starten"
      >
        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
        <Mic className="w-10 h-10 relative z-10" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-6">
      {/* Pause/Resume Button */}
      <button
        onClick={isPaused ? onResume : onPause}
        className="w-14 h-14 rounded-full bg-dark-800 border border-dark-700 text-white shadow-dark hover:bg-dark-700 hover:border-gold-500/30 transition-all duration-200 flex items-center justify-center"
        aria-label={isPaused ? 'Fortsetzen' : 'Pausieren'}
      >
        {isPaused ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
      </button>

      {/* Recording indicator */}
      <div className="relative">
        <button
          onClick={onStop}
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 text-dark-950 shadow-gold-lg flex items-center justify-center recording-pulse"
          aria-label="Aufnahme stoppen"
        >
          <Square className="w-8 h-8 fill-current" />
        </button>
        
        {/* Waveform visualization */}
        {!isPaused && (
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-end gap-1.5 h-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-gradient-to-t from-gold-500 to-gold-400 rounded-full waveform-bar"
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
