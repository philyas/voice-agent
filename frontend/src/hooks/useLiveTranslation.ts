'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseLiveTranslationReturn {
  translatedText: string;
  isTranslating: boolean;
  error: string | null;
  startTranslation: (originalText: string) => void;
  stopTranslation: () => void;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useLiveTranslation(): UseLiveTranslationReturn {
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const startTranslation = useCallback(async (originalText: string) => {
    if (!originalText || originalText.trim().length === 0) {
      return;
    }

    // Cancel previous translation if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();
    setIsTranslating(true);
    setError(null);
    setTranslatedText('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/realtime/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: originalText,
          targetLanguage: 'de',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Translation request failed');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let fullTranslation = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                fullTranslation += parsed.choices[0].delta.content;
                setTranslatedText(fullTranslation);
              } else if (parsed.choices?.[0]?.message?.content) {
                // Final message
                fullTranslation = parsed.choices[0].message.content;
                setTranslatedText(fullTranslation);
              }
            } catch (e) {
              // Ignore parse errors for incomplete JSON
            }
          }
        }
      }

      setIsTranslating(false);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Translation was cancelled, ignore
        return;
      }
      const message = err instanceof Error ? err.message : 'Translation failed';
      setError(message);
      setIsTranslating(false);
      console.error('[LiveTranslation] Error:', err);
    }
  }, []);

  const stopTranslation = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsTranslating(false);
    setTranslatedText('');
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranslation();
    };
  }, [stopTranslation]);

  return {
    translatedText,
    isTranslating,
    error,
    startTranslation,
    stopTranslation,
  };
}
