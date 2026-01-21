'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Mic, Upload, Loader2, History, Sparkles } from 'lucide-react';
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
      <header className="sticky top-0 z-50 glass border-b border-dark-700/50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
                <Mic className="w-6 h-6 text-dark-950" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Voice Agent</h1>
                <p className="text-sm text-dark-400">
                  Sprachaufnahme & KI-Transkription
                </p>
              </div>
            </div>
            <Link
              href="/history"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:border-dark-600 transition-all duration-200"
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">Historie</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Error Messages */}
        {(recorderError || processing.error) && (
          <div className="mb-8">
            <StatusMessage
              type="error"
              message={recorderError || processing.error || ''}
              onClose={() => setProcessing((prev) => ({ ...prev, error: null }))}
            />
          </div>
        )}

        {/* Recording Section */}
        <section className="mb-10">
          <div className="bg-dark-850 border border-dark-700 rounded-3xl p-10 card-hover">
            <div className="flex flex-col items-center">
              {/* Duration Display */}
              {isRecording && (
                <div className="mb-8 text-center animate-fade-in">
                  <span className="text-6xl font-light text-white tracking-tight font-mono">
                    {formatDuration(duration)}
                  </span>
                  <p className="text-sm text-dark-400 mt-2 font-medium">
                    {isPaused ? 'Pausiert' : 'Aufnahme läuft...'}
                  </p>
                </div>
              )}

              {/* Instruction Text */}
              {!isRecording && !audioUrl && (
                <div className="mb-10 text-center max-w-md">
                  <h2 className="text-2xl font-semibold text-white mb-3">
                    Bereit für die Aufnahme
                  </h2>
                  <p className="text-dark-400 leading-relaxed">
                    Klicke auf den Button, um eine Sprachaufnahme zu starten. 
                    Deine Aufnahme wird automatisch transkribiert und kann mit KI angereichert werden.
                  </p>
                </div>
              )}

              {/* Record Button */}
              <div className="mb-8">
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
                <div className="w-full max-w-lg animate-fade-in-up">
                  <AudioPlayer audioUrl={audioUrl} onReset={handleReset} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Process Button */}
        {audioUrl && !isRecording && processing.step === 'idle' && (
          <section className="mb-10 animate-fade-in-up">
            <button
              onClick={processRecording}
              className="w-full py-5 px-8 bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 text-dark-950 rounded-2xl font-semibold shadow-gold-lg hover:shadow-gold transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-3 btn-shine"
            >
              <Sparkles className="w-5 h-5" />
              Aufnahme verarbeiten & transkribieren
            </button>
          </section>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <section className="mb-10 animate-fade-in">
            <div className="bg-dark-850 border border-dark-700 rounded-2xl p-8">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-dark-700" />
                  <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">
                    {processing.step === 'uploading' && 'Aufnahme wird hochgeladen...'}
                    {processing.step === 'transcribing' && 'Wird transkribiert mit Whisper...'}
                  </p>
                  <p className="text-sm text-dark-400 mt-1">
                    Bitte warten Sie einen Moment
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Transcription Result */}
        {processing.transcription && (
          <section className="mb-10">
            <TranscriptionCard
              text={processing.transcription.text}
              onEnrich={handleEnrich}
              enrichments={processing.enrichments}
            />
          </section>
        )}

        {/* New Recording Button (after transcription) */}
        {processing.step === 'done' && (
          <section className="animate-fade-in">
            <button
              onClick={handleReset}
              className="w-full py-4 px-6 bg-dark-800 border border-dark-700 text-dark-300 rounded-xl font-medium hover:text-white hover:border-dark-600 transition-all duration-200"
            >
              Neue Aufnahme starten
            </button>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-dark-800">
        <p className="text-sm text-dark-500">
          Voice Agent — Powered by <span className="text-gold-500">OpenAI Whisper</span> & <span className="text-gold-500">GPT-4o-mini</span>
        </p>
      </footer>
    </main>
  );
}
