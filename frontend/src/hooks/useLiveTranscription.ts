'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseLiveTranscriptionReturn {
  liveText: string;
  isConnected: boolean;
  error: string | null;
  startTranscription: (audioStream: MediaStream, language?: string) => void;
  stopTranscription: () => void;
  onTranscriptionUpdate: (callback: (text: string) => void) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const WS_URL = API_BASE_URL.replace(/^http/, 'ws');

export function useLiveTranscription(): UseLiveTranscriptionReturn {
  const [liveText, setLiveText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const updateCallbackRef = useRef<((text: string) => void) | null>(null);
  const completedTextRef = useRef<string>(''); // All completed transcriptions
  const currentItemIdRef = useRef<string | null>(null);
  const currentItemTextRef = useRef<string>(''); // Current partial item text

  const onTranscriptionUpdate = useCallback((callback: (text: string) => void) => {
    updateCallbackRef.current = callback;
  }, []);

  const startTranscription = useCallback(async (audioStream: MediaStream, language = 'de') => {
    try {
      setError(null);
      setLiveText('');
      completedTextRef.current = '';
      currentItemIdRef.current = null;
      currentItemTextRef.current = '';
      streamRef.current = audioStream;

      // Create WebSocket connection
      const ws = new WebSocket(`${WS_URL}/api/v1/realtime/transcribe?language=${language}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[LiveTranscription] WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'transcription.delta') {
            // Partial transcription update (incremental delta)
            const itemId = message.item_id;
            
            // If new item started, reset current item text
            if (itemId !== currentItemIdRef.current) {
              currentItemIdRef.current = itemId;
              currentItemTextRef.current = '';
            }
            
            // Append delta to current item text
            currentItemTextRef.current += message.text || '';
            
            // Combine completed text + current partial text
            const fullText = completedTextRef.current 
              ? `${completedTextRef.current} ${currentItemTextRef.current}`.trim()
              : currentItemTextRef.current;
            
            setLiveText(fullText);
            if (updateCallbackRef.current) {
              updateCallbackRef.current(fullText);
            }
          } else if (message.type === 'transcription.completed') {
            // Final transcription for a speech turn
            const completedItemText = (message.text || '').trim();
            
            // Add completed text to completed text ref
            if (completedItemText) {
              completedTextRef.current = completedTextRef.current
                ? `${completedTextRef.current} ${completedItemText}`.trim()
                : completedItemText;
            }
            
            // Clear current item
            currentItemIdRef.current = null;
            currentItemTextRef.current = '';
            
            // Update display with only completed text
            setLiveText(completedTextRef.current);
            if (updateCallbackRef.current) {
              updateCallbackRef.current(completedTextRef.current);
            }
          } else if (message.type === 'error') {
            setError(message.error || 'Transcription error');
          } else if (message.type === 'ready' || message.type === 'session.ready') {
            console.log('[LiveTranscription] Ready to receive audio');
          }
        } catch (err) {
          console.error('[LiveTranscription] Error parsing message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[LiveTranscription] WebSocket error:', err);
        setError('Connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('[LiveTranscription] WebSocket closed');
        setIsConnected(false);
      };

      // Wait for ready signal before starting audio processing
      await new Promise((resolve) => {
        const checkReady = () => {
          if (ws.readyState === WebSocket.OPEN) {
            // Give it a moment for session to be ready
            setTimeout(resolve, 500);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      });

      // Setup audio processing
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // OpenAI requires 24kHz
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(audioStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Convert Float32Array to Int16Array (PCM16)
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            // Clamp and convert to 16-bit integer
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Convert to base64
          const uint8Array = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binary);

          // Send to server
          ws.send(JSON.stringify({
            type: 'audio',
            data: base64,
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start transcription';
      setError(message);
      console.error('[LiveTranscription] Error:', err);
    }
  }, []);

  const stopTranscription = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'close' }));
      wsRef.current.close();
      wsRef.current = null;
    }

    // Cleanup audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setLiveText('');
    completedTextRef.current = '';
    currentItemIdRef.current = null;
    currentItemTextRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  return {
    liveText,
    isConnected,
    error,
    startTranscription,
    stopTranscription,
    onTranscriptionUpdate,
  };
}
