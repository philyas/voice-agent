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

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-dark-850 border border-dark-700 rounded-2xl p-5">
      <audio ref={audioRef} src={audioUrl} />
      
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlayPause}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 text-dark-950 flex items-center justify-center hover:shadow-gold transition-all duration-200 btn-shine"
          aria-label={isPlaying ? 'Pause' : 'Abspielen'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="flex-1">
          {/* Progress bar container */}
          <div className="relative h-1.5 bg-dark-700 rounded-full overflow-hidden mb-2">
            <div 
              className="absolute h-full bg-gradient-to-r from-gold-500 to-gold-400 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full absolute opacity-0 cursor-pointer"
            style={{ marginTop: '-14px', height: '20px' }}
          />
          <div className="flex justify-between text-xs text-dark-400 font-medium">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="w-10 h-10 rounded-full bg-dark-800 border border-dark-700 text-dark-400 flex items-center justify-center hover:text-white hover:border-dark-600 transition-all duration-200"
            aria-label="Zurücksetzen"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
