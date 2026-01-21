'use client';

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { ConfirmationModal } from './ConfirmationModal';

interface AudioPlayerProps {
  audioUrl: string;
  onReset?: () => void;
  fallbackDuration?: number; // Duration in seconds as fallback
}

export function AudioPlayer({ audioUrl, onReset, fallbackDuration }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration || 0);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Reset error and duration when URL changes
    setError(null);
    setDuration(fallbackDuration || 0);
    setCurrentTime(0);
    setIsPlaying(false);

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      const audioDuration = audio.duration;
      // Only set duration if it's a valid number (not Infinity or NaN)
      if (isFinite(audioDuration) && !isNaN(audioDuration) && audioDuration > 0) {
        setDuration(audioDuration);
      } else if (fallbackDuration) {
        // Use fallback duration if audio metadata is invalid
        setDuration(fallbackDuration);
      }
      setError(null);
    };
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e: Event) => {
      const audioElement = e.target as HTMLAudioElement;
      let errorMsg = 'Fehler beim Laden der Audio-Datei';
      
      if (audioElement.error) {
        switch (audioElement.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMsg = 'Audio-Wiedergabe wurde abgebrochen';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMsg = 'Netzwerkfehler beim Laden der Audio-Datei';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMsg = 'Audio-Datei konnte nicht decodiert werden';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMsg = 'Audio-Format wird nicht unterstützt';
            break;
        }
      }
      setError(errorMsg);
      setIsPlaying(false);
      console.error('Audio error:', audioElement.error);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [audioUrl, fallbackDuration]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Play error:', err);
        setError('Fehler beim Abspielen der Audio-Datei');
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    // Handle invalid time values
    if (!isFinite(time) || isNaN(time) || time < 0) {
      return '0:00';
    }
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
    <div className="bg-dark-850 border border-dark-700 rounded-2xl p-5">
      <audio 
        ref={audioRef} 
        src={audioUrl}
        crossOrigin="anonymous"
        preload="metadata"
      />
      
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
      
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
            max={isFinite(duration) && duration > 0 ? duration : 100}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowResetModal(true);
            }}
            className="w-10 h-10 rounded-full bg-dark-800 border border-dark-700 text-dark-400 flex items-center justify-center hover:text-white hover:border-dark-600 transition-all duration-200 cursor-pointer relative"
            aria-label="Zurücksetzen"
            type="button"
          >
            <RotateCcw className="w-4 h-4 pointer-events-none" />
          </button>
        )}
      </div>

    </div>
    {mounted && showResetModal && createPortal(
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={() => {
          if (onReset) {
            onReset();
          }
          setShowResetModal(false);
        }}
        title="Aufnahme zurücksetzen?"
        message="Möchten Sie die Aufnahme wirklich zurücksetzen? Diese Aktion kann nicht rückgängig gemacht werden."
        confirmText="Zurücksetzen"
        cancelText="Abbrechen"
        variant="warning"
      />,
      document.body
    )}
    </>
  );
}
