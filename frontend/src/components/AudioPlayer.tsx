'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  onReset?: () => void;
}

export function AudioPlayer({ audioUrl, onReset }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md">
      <audio ref={audioRef} src={audioUrl} />
      
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlayPause}
          className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors"
          aria-label={isPlaying ? 'Pause' : 'Abspielen'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            aria-label="Zurücksetzen"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
