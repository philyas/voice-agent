'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Mic, Upload, Loader2, History, Sparkles, Keyboard, Monitor } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useElectron, useHotkeyListener } from '@/hooks/useElectron';
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

  const { isElectron, platform, notifyRecordingState } = useElectron();

  const [processing, setProcessing] = useState<ProcessingState>({
    step: 'idle',
    recordingId: null,
    transcription: null,
    enrichments: [],
    error: null,
  });

  // Handle hotkey-triggered recording
  const handleHotkeyStartRecording = useCallback(() => {
    if (!isRecording && processing.step === 'idle') {
      startRecording();
    }
  }, [isRecording, processing.step, startRecording]);

  const handleHotkeyStopRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
  }, [isRecording, stopRecording]);

  // Listen for hotkey events from Electron
  useHotkeyListener(handleHotkeyStartRecording, handleHotkeyStopRecording);

  // Notify Electron of recording state changes
  useEffect(() => {
    notifyRecordingState(isRecording);
  }, [isRecording, notifyRecordingState]);

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
    <main className="min-h-screen relative z-10">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-transparent bg-gradient-to-b from-dark-900/95 via-dark-900/90 to-dark-900/95" style={{ borderImage: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.2), transparent) 1' }}>
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
                <Mic className="w-6 h-6 text-dark-950" strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    <span className="bg-gradient-to-r from-gold-400 via-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
                      EverlastAI
                    </span>
                    <span className="bg-gradient-to-r from-white/90 via-white/70 to-white/90 bg-clip-text text-transparent font-semibold text-lg ml-2">
                      Audio Intelligence
                    </span>
                  </h1>
                  {isElectron && (
                    <span className="px-2 py-0.5 text-xs bg-dark-700 text-gold-500 rounded-full flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      Desktop
                    </span>
                  )}
                </div>
                <p className="text-sm bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent">
                  Sprachaufnahme & KI-Transkription
                </p>
              </div>
            </div>
            <Link
              href="/history"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-dark-800 via-dark-800 to-dark-850 border border-dark-700/50 text-dark-300 hover:text-white hover:border-gold-500/30 hover:bg-gradient-to-br hover:from-dark-750 hover:via-dark-800 hover:to-dark-850 transition-all duration-200"
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
          <div className="bg-gradient-to-br from-dark-850 via-dark-850 to-dark-900 border border-dark-700/50 rounded-3xl p-10 relative overflow-hidden transition-all duration-300 hover:border-gold-500/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(212,168,83,0.15),0_0_30px_rgba(212,168,83,0.05)]">
            <div className="absolute inset-0 bg-gradient-to-br from-gold-500/0 via-gold-500/0 to-gold-500/0 hover:via-gold-500/5 transition-all duration-500 pointer-events-none rounded-3xl" />
            <div className="flex flex-col items-center">
              {/* Duration Display */}
              {isRecording && (
                <div className="mb-8 text-center animate-fade-in">
                  <span className="text-6xl font-light tracking-tight font-mono bg-gradient-to-br from-gold-400 via-gold-300 to-gold-500 bg-clip-text text-transparent">
                    {formatDuration(duration)}
                  </span>
                  <p className="text-sm bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent mt-2 font-medium">
                    {isPaused ? 'Pausiert' : 'Aufnahme läuft...'}
                  </p>
                </div>
              )}

              {/* Instruction Text */}
              {!isRecording && !audioUrl && (
                <div className="mb-10 text-center max-w-md">
                  <h2 className="text-2xl font-semibold mb-3 bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent">
                    Bereit für die Aufnahme
                  </h2>
                  <p className="bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent leading-relaxed">
                    Klicke auf den Button, um eine Sprachaufnahme zu starten. 
                    Deine Aufnahme wird automatisch transkribiert und kann mit KI angereichert werden.
                  </p>
                  {/* Hotkey Hint for Electron */}
                  {isElectron && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-dark-500">
                      <Keyboard className="w-4 h-4" />
                      <span>
                        Hotkey: <kbd className="px-2 py-1 bg-gradient-to-br from-dark-800 to-dark-850 border border-gold-500/20 rounded text-gold-400 font-mono text-xs">
                          {platform === 'darwin' ? '⌘' : 'Ctrl'}+Shift+V
                        </kbd>
                      </span>
                    </div>
                  )}
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
              className="w-full py-5 px-8 bg-gradient-to-r from-gold-500 via-gold-400 via-gold-500 to-gold-600 text-dark-950 rounded-2xl font-semibold shadow-gold-lg hover:shadow-gold transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-3 btn-shine relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Sparkles className="w-5 h-5" />
              Aufnahme verarbeiten & transkribieren
            </button>
          </section>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <section className="mb-10 animate-fade-in">
            <div className="bg-gradient-to-br from-dark-850 via-dark-850 to-dark-900 border border-dark-700/50 rounded-2xl p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 via-transparent to-gold-500/5 pointer-events-none" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-dark-700/50" />
                  <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-gold-500/30 border-t-gold-500 border-r-gold-400 animate-spin" />
                </div>
                <div>
                  <p className="font-semibold bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent text-lg">
                    {processing.step === 'uploading' && 'Aufnahme wird hochgeladen...'}
                    {processing.step === 'transcribing' && 'Wird transkribiert mit Whisper...'}
                  </p>
                  <p className="text-sm bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent mt-1">
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
              className="w-full py-4 px-6 bg-gradient-to-br from-dark-800 via-dark-800 to-dark-850 border border-dark-700/50 text-dark-300 rounded-xl font-medium hover:text-white hover:border-gold-500/30 hover:bg-gradient-to-br hover:from-dark-750 hover:via-dark-800 hover:to-dark-850 transition-all duration-200"
            >
              Neue Aufnahme starten
            </button>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-transparent bg-gradient-to-b from-transparent via-dark-900/50 to-transparent" style={{ borderImage: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.1), transparent) 1' }}>
        <p className="text-sm bg-gradient-to-r from-dark-500 via-dark-400 to-dark-500 bg-clip-text text-transparent">
          by <span className="bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 bg-clip-text text-transparent font-medium">EverlastAI</span>
        </p>
      </footer>
    </main>
  );
}
