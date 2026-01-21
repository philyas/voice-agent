'use client';

import { useState, useCallback } from 'react';
import { Mic, Upload, Loader2 } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { RecordButton, AudioPlayer, TranscriptionCard, StatusMessage } from '@/components';
import { api, type EnrichmentType, type Transcription, type Enrichment } from '@/lib/api';

type ProcessingStep = 'idle' | 'uploading' | 'transcribing' | 'done';

interface ProcessingState {
  step: ProcessingStep;
  recordingId: string | null;
  transcription: Transcription | null;
  enrichments: Enrichment[];
  error: string | null;
}

export default function Home() {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error: recorderError,
  } = useAudioRecorder();

  const [processing, setProcessing] = useState<ProcessingState>({
    step: 'idle',
    recordingId: null,
    transcription: null,
    enrichments: [],
    error: null,
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processRecording = useCallback(async () => {
    if (!audioBlob) return;

    setProcessing((prev) => ({ ...prev, step: 'uploading', error: null }));

    try {
      // Upload recording
      const uploadResponse = await api.uploadRecording(
        audioBlob,
        `recording-${Date.now()}.webm`
      );

      if (!uploadResponse.data) {
        throw new Error('Upload failed');
      }

      const recordingId = uploadResponse.data.id;
      setProcessing((prev) => ({ ...prev, recordingId, step: 'transcribing' }));

      // Transcribe
      const transcribeResponse = await api.transcribeRecording(recordingId, 'de');

      if (!transcribeResponse.data) {
        throw new Error('Transcription failed');
      }

      setProcessing((prev) => ({
        ...prev,
        step: 'done',
        transcription: transcribeResponse.data!,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten';
      setProcessing((prev) => ({ ...prev, step: 'idle', error: message }));
    }
  }, [audioBlob]);

  const handleEnrich = useCallback(
    async (type: EnrichmentType) => {
      if (!processing.transcription) return;

      const response = await api.enrichTranscription(processing.transcription.id, type);

      if (response.data) {
        setProcessing((prev) => ({
          ...prev,
          enrichments: [...prev.enrichments, response.data!],
        }));
      }
    },
    [processing.transcription]
  );

  const handleReset = useCallback(() => {
    resetRecording();
    setProcessing({
      step: 'idle',
      recordingId: null,
      transcription: null,
      enrichments: [],
      error: null,
    });
  }, [resetRecording]);

  const isProcessing = processing.step !== 'idle' && processing.step !== 'done';

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Voice Agent</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sprachaufnahme & KI-Transkription
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Error Messages */}
        {(recorderError || processing.error) && (
          <div className="mb-6">
            <StatusMessage
              type="error"
              message={recorderError || processing.error || ''}
              onClose={() => setProcessing((prev) => ({ ...prev, error: null }))}
            />
          </div>
        )}

        {/* Recording Section */}
        <section className="mb-8">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
            <div className="flex flex-col items-center">
              {/* Duration Display */}
              {isRecording && (
                <div className="mb-6 text-center">
                  <span className="text-4xl font-mono font-bold text-gray-900 dark:text-white">
                    {formatDuration(duration)}
                  </span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {isPaused ? 'Pausiert' : 'Aufnahme läuft...'}
                  </p>
                </div>
              )}

              {/* Instruction Text */}
              {!isRecording && !audioUrl && (
                <div className="mb-6 text-center">
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    Klicke auf den Button, um eine Aufnahme zu starten
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tipp: Nutze <kbd className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs">Strg + Shift + R</kbd> als Hotkey
                  </p>
                </div>
              )}

              {/* Record Button */}
              <div className="mb-6">
                <RecordButton
                  isRecording={isRecording}
                  isPaused={isPaused}
                  onStart={startRecording}
                  onStop={stopRecording}
                  onPause={pauseRecording}
                  onResume={resumeRecording}
                  disabled={isProcessing}
                />
              </div>

              {/* Audio Player (after recording) */}
              {audioUrl && !isRecording && (
                <div className="w-full max-w-md">
                  <AudioPlayer audioUrl={audioUrl} onReset={handleReset} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Process Button */}
        {audioUrl && !isRecording && processing.step === 'idle' && (
          <section className="mb-8">
            <button
              onClick={processRecording}
              className="w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              Aufnahme verarbeiten & transkribieren
            </button>
          </section>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <section className="mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {processing.step === 'uploading' && 'Aufnahme wird hochgeladen...'}
                    {processing.step === 'transcribing' && 'Wird transkribiert mit Whisper...'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Bitte warten Sie einen Moment
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Transcription Result */}
        {processing.transcription && (
          <section className="mb-8">
            <TranscriptionCard
              text={processing.transcription.text}
              onEnrich={handleEnrich}
              enrichments={processing.enrichments}
            />
          </section>
        )}

        {/* New Recording Button (after transcription) */}
        {processing.step === 'done' && (
          <section>
            <button
              onClick={handleReset}
              className="w-full py-3 px-6 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
            >
              Neue Aufnahme starten
            </button>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>Voice Agent - Powered by OpenAI Whisper & GPT-4o-mini</p>
      </footer>
    </main>
  );
}
