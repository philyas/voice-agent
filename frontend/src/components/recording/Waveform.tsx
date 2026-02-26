'use client';

import { useEffect, useRef, useState } from 'react';

interface WaveformProps {
  audioStream: MediaStream | null;
  isRecording: boolean;
  isPaused: boolean;
  className?: string;
}

export function Waveform({ audioStream, isRecording, isPaused, className = '' }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!audioStream || !isRecording) {
      // Cleanup when not recording
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
        analyserRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsInitialized(false);
      return;
    }

    // Initialize audio context and analyser
    const initAudio = async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Set canvas size first
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          // Wait a bit for layout
          setTimeout(initAudio, 100);
          return;
        }
        
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Scale context for high DPI displays
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Create audio context
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;

        // Create analyser node
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048; // Higher resolution
        analyser.smoothingTimeConstant = 0.8; // Smooth transitions
        analyserRef.current = analyser;

        // Connect audio source
        const source = audioContext.createMediaStreamSource(audioStream);
        sourceRef.current = source;
        source.connect(analyser);

        setIsInitialized(true);

        // Buffer for frequency data
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Drawing function
        const draw = () => {
          // Get current canvas dimensions
          const currentRect = canvas.getBoundingClientRect();
          const canvasWidth = currentRect.width || 800;
          const canvasHeight = currentRect.height || 128;

          if (!isRecording || isPaused) {
            // Draw empty waveform when paused (light background)
            ctx.fillStyle = 'rgba(248, 248, 250, 1)';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            animationFrameRef.current = requestAnimationFrame(draw);
            return;
          }

          animationFrameRef.current = requestAnimationFrame(draw);

          analyser.getByteFrequencyData(dataArray);

          // Clear canvas (light background)
          ctx.fillStyle = 'rgba(248, 248, 250, 1)';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);

          // Only use lower frequencies for cleaner visualization (first 200 bins)
          const maxBars = Math.min(200, bufferLength);
          
          // Calculate bar width based on maxBars, not bufferLength, so it fills the full width
          const barWidth = canvasWidth / maxBars;
          let x = 0;
          
          for (let i = 0; i < maxBars; i++) {
            const barHeight = (dataArray[i] / 255) * canvasHeight * 0.6;

            // Create gradient for each bar - more subtle colors
            const gradient = ctx.createLinearGradient(0, canvasHeight - barHeight, 0, canvasHeight);
            gradient.addColorStop(0, 'rgba(212, 168, 83, 0.4)'); // Gold at top - more subtle
            gradient.addColorStop(0.5, 'rgba(212, 168, 83, 0.3)'); // Gold middle
            gradient.addColorStop(1, 'rgba(212, 168, 83, 0.1)'); // Gold fade at bottom

            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvasHeight - barHeight, barWidth - 1, barHeight);

            // Mirror effect (bottom half) - more subtle
            const mirrorHeight = barHeight * 0.2;
            ctx.fillStyle = 'rgba(212, 168, 83, 0.08)';
            ctx.fillRect(x, canvasHeight, barWidth - 1, mirrorHeight);

            x += barWidth;
          }

          // Draw center line - more subtle
          ctx.strokeStyle = 'rgba(212, 168, 83, 0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, canvasHeight / 2);
          ctx.lineTo(canvasWidth, canvasHeight / 2);
          ctx.stroke();
        };

        // Start drawing loop
        draw();
      } catch (error) {
        console.error('Error initializing waveform:', error);
      }
    };

    initAudio();

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioStream, isRecording, isPaused]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isRecording) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    };

    // Initial resize
    resizeCanvas();
    
    // Resize observer for better handling
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    
    window.addEventListener('resize', resizeCanvas);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      resizeObserver.disconnect();
    };
  }, [isRecording]);

  if (!isRecording) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full h-16 rounded-xl overflow-hidden bg-gradient-to-br from-dark-100 via-dark-50 to-dark-200 border border-dark-300/80">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
            <div className="px-4 py-2 rounded-lg bg-white/90 border border-ptw-400/40 shadow-sm">
              <p className="text-sm text-ptw-600 font-medium">Pausiert</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
