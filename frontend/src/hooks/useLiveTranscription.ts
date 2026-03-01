'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface LiveSpeakerSegment {
  speaker: number;
  text: string;
  isFinal: boolean;
}

interface UseLiveTranscriptionReturn {
  liveText: string;
  liveSegments: LiveSpeakerSegment[];
  isConnected: boolean;
  error: string | null;
  startTranscription: (audioStream: MediaStream, language?: string) => void;
  stopTranscription: () => void;
  onTranscriptionUpdate: (callback: (payload: { text: string; segments: LiveSpeakerSegment[] }) => void) => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const WS_URL = API_BASE_URL.replace(/^http/, 'ws');

function mergeSegments(segments: LiveSpeakerSegment[]): LiveSpeakerSegment[] {
  if (segments.length === 0) return [];

  const merged: LiveSpeakerSegment[] = [];

  for (const segment of segments) {
    const normalizedText = segment.text.trim();
    if (!normalizedText) continue;

    const lastSegment = merged[merged.length - 1];
    if (lastSegment && lastSegment.speaker === segment.speaker && lastSegment.isFinal === segment.isFinal) {
      lastSegment.text = `${lastSegment.text} ${normalizedText}`.trim();
      continue;
    }

    merged.push({
      speaker: segment.speaker,
      text: normalizedText,
      isFinal: segment.isFinal,
    });
  }

  return merged;
}

export function useLiveTranscription(): UseLiveTranscriptionReturn {
  const [liveText, setLiveText] = useState('');
  const [liveSegments, setLiveSegments] = useState<LiveSpeakerSegment[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const updateCallbackRef = useRef<((payload: { text: string; segments: LiveSpeakerSegment[] }) => void) | null>(null);
  const finalizedSegmentsRef = useRef<LiveSpeakerSegment[]>([]);
  const interimSegmentsRef = useRef<LiveSpeakerSegment[]>([]);

  const emitUpdate = useCallback((finalized: LiveSpeakerSegment[], interim: LiveSpeakerSegment[] = []) => {
    const allSegments = mergeSegments([...finalized, ...interim]);
    const fullText = allSegments.map((segment) => segment.text).join(' ').trim();

    setLiveSegments(allSegments);
    setLiveText(fullText);

    if (updateCallbackRef.current) {
      updateCallbackRef.current({
        text: fullText,
        segments: allSegments,
      });
    }
  }, []);

  const onTranscriptionUpdate = useCallback((callback: (payload: { text: string; segments: LiveSpeakerSegment[] }) => void) => {
    updateCallbackRef.current = callback;
  }, []);

  const startTranscription = useCallback(async (audioStream: MediaStream, language = 'de') => {
    try {
      setError(null);
      setLiveText('');
      setLiveSegments([]);
      finalizedSegmentsRef.current = [];
      interimSegmentsRef.current = [];

      // Get actual sample rate from browser (so backend can tell Deepgram the correct rate)
      const audioContextForRate = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sampleRate = audioContextForRate.sampleRate;
      audioContextForRate.close();

      const wsUrl = `${WS_URL}/api/v1/realtime/transcribe?language=${encodeURIComponent(language)}&sample_rate=${sampleRate}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[LiveTranscription] WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'transcription.delta') {
            const interimSpeakerSegments: LiveSpeakerSegment[] = (message.speakerSegments || []).map((segment: { speaker: number; text: string }) => ({
              speaker: Number.isFinite(segment.speaker) ? segment.speaker : 0,
              text: segment.text || '',
              isFinal: false,
            }));

            interimSegmentsRef.current = interimSpeakerSegments.length > 0
              ? interimSpeakerSegments
              : message.text
                ? [{ speaker: 0, text: message.text, isFinal: false }]
                : [];

            emitUpdate(finalizedSegmentsRef.current, interimSegmentsRef.current);
          } else if (message.type === 'transcription.completed') {
            const finalSpeakerSegments: LiveSpeakerSegment[] = (message.speakerSegments || []).map((segment: { speaker: number; text: string }) => ({
              speaker: Number.isFinite(segment.speaker) ? segment.speaker : 0,
              text: segment.text || '',
              isFinal: true,
            }));

            const fallbackSegment = message.text
              ? [{ speaker: 0, text: message.text, isFinal: true as const }]
              : [];

            finalizedSegmentsRef.current = mergeSegments([
              ...finalizedSegmentsRef.current,
              ...(finalSpeakerSegments.length > 0 ? finalSpeakerSegments : fallbackSegment),
            ]);

            interimSegmentsRef.current = [];
            emitUpdate(finalizedSegmentsRef.current);
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

      // Wait for WebSocket to be open before starting audio
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
        const checkReady = () => {
          if (ws.readyState === WebSocket.OPEN) {
            clearTimeout(timeout);
            setTimeout(resolve, 300);
          } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
            clearTimeout(timeout);
            reject(new Error('WebSocket closed before ready'));
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });

      // Use same sample rate as we sent to backend (browser default so audio is actually processed)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(audioStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = event.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          const uint8Array = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          ws.send(JSON.stringify({
            type: 'audio',
            data: btoa(binary),
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Required in most browsers: resume context so audio is processed (user gesture already happened)
      await audioContext.resume();

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start transcription';
      setError(message);
      console.error('[LiveTranscription] Error:', err);
    }
  }, []);

  const stopTranscription = useCallback(() => {
    // Close WebSocket
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'close' }));
      }
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
    setLiveSegments([]);
    finalizedSegmentsRef.current = [];
    interimSegmentsRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  return {
    liveText,
    liveSegments,
    isConnected,
    error,
    startTranscription,
    stopTranscription,
    onTranscriptionUpdate,
  };
}
