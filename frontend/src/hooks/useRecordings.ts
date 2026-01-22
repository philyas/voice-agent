/**
 * useRecordings Hook
 * Manages recording list state, loading, and operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Recording, Transcription } from '@/lib/types';

interface UseRecordingsReturn {
  recordings: Recording[];
  loading: boolean;
  error: string | null;
  selectedRecording: Recording | null;
  transcription: Transcription | null;
  recordingRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  loadRecordings: () => Promise<void>;
  loadTranscription: (recordingId: string) => Promise<void>;
  selectRecording: (recording: Recording) => Promise<void>;
  deleteRecording: (id: string) => Promise<void>;
  setError: (error: string | null) => void;
  clearSelection: () => void;
}

export function useRecordings(): UseRecordingsReturn {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const recordingRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  /**
   * Load all recordings from API
   */
  const loadRecordings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getRecordings();
      if (response.data) {
        setRecordings(response.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Aufnahmen');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load transcription for a specific recording
   */
  const loadTranscription = useCallback(async (recordingId: string) => {
    try {
      const response = await api.getTranscriptions();
      if (response.data) {
        const trans = response.data.find((t: Transcription) => t.recording_id === recordingId);
        if (trans) {
          const fullTrans = await api.getTranscription(trans.id);
          if (fullTrans.data) {
            setTranscription(fullTrans.data);
          }
        }
      }
    } catch (err) {
      console.error('Error loading transcription:', err);
    }
  }, []);

  /**
   * Select a recording and load its transcription
   */
  const selectRecording = useCallback(async (recording: Recording) => {
    setSelectedRecording(recording);
    setTranscription(null);
    await loadTranscription(recording.id);
  }, [loadTranscription]);

  /**
   * Delete a recording
   */
  const deleteRecording = useCallback(async (id: string) => {
    if (!confirm('Möchten Sie diese Aufnahme wirklich löschen?')) return;

    try {
      await api.deleteRecording(id);
      setRecordings(prev => prev.filter((r) => r.id !== id));
      recordingRefs.current.delete(id);
      
      if (selectedRecording?.id === id) {
        setSelectedRecording(null);
        setTranscription(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  }, [selectedRecording]);

  /**
   * Clear current selection
   */
  const clearSelection = useCallback(() => {
    setSelectedRecording(null);
    setTranscription(null);
  }, []);

  // Load recordings on mount
  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  return {
    recordings,
    loading,
    error,
    selectedRecording,
    transcription,
    recordingRefs,
    loadRecordings,
    loadTranscription,
    selectRecording,
    deleteRecording,
    setError,
    clearSelection,
  };
}

export default useRecordings;
