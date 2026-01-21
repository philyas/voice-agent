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
        className="group relative w-24 h-24 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 via-gold-400 to-gold-600 text-dark-950 shadow-gold-lg hover:shadow-gold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center btn-shine overflow-hidden"
        aria-label="Aufnahme starten"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gold-300/50 via-transparent to-gold-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
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
        className="w-14 h-14 rounded-full bg-gradient-to-br from-dark-800 via-dark-800 to-dark-850 border border-dark-700/50 text-white shadow-dark hover:bg-gradient-to-br hover:from-dark-750 hover:via-dark-800 hover:to-dark-850 hover:border-gold-500/40 transition-all duration-200 flex items-center justify-center group"
        aria-label={isPaused ? 'Fortsetzen' : 'Pausieren'}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gold-500/0 via-gold-500/0 to-gold-500/0 group-hover:from-gold-500/10 group-hover:via-gold-500/5 group-hover:to-gold-500/10 transition-all duration-200" />
        <div className="relative z-10">
          {isPaused ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
        </div>
      </button>

      {/* Recording indicator */}
      <div className="relative">
        <button
          onClick={onStop}
          className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gold-400 via-gold-500 via-gold-400 to-gold-600 text-dark-950 shadow-gold-lg flex items-center justify-center recording-pulse overflow-hidden group"
          aria-label="Aufnahme stoppen"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gold-300/30 via-transparent to-gold-600/30 animate-pulse rounded-full" />
          <div className="absolute inset-0 bg-gradient-to-br from-gold-500/20 via-gold-500/10 to-gold-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full" />
          <Square className="w-8 h-8 fill-current relative z-10" />
        </button>
      </div>

      {/* Spacer to balance the layout */}
      <div className="w-14 h-14" />
    </div>
  );
}
