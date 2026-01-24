'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, History, Sparkles, Keyboard, Monitor, X, MessageSquare } from 'lucide-react';
import { useAudioRecorder, useElectron, useHotkeyListener } from '@/hooks';
import { RecordButton, AudioPlayer, TranscriptionCard, StatusMessage, Waveform } from '@/components';
import { api } from '@/lib/api';
import type { EnrichmentType, Transcription, Enrichment } from '@/lib/types';
import { formatDurationSeconds } from '@/lib/utils';

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
    audioStream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error: recorderError,
  } = useAudioRecorder();

  const { isElectron, platform, notifyRecordingState, openSystemPreferences } = useElectron();
  const router = useRouter();

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

  // Use the centralized utility function
  const formatDuration = formatDurationSeconds;

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
    async (type: EnrichmentType, targetLanguage?: string) => {
      if (!processing.transcription || !processing.recordingId) return;

      const response = await api.enrichTranscription(processing.transcription.id, type, undefined, targetLanguage);

      if (response.data) {
        setProcessing((prev) => ({
          ...prev,
          enrichments: [...prev.enrichments, response.data!],
        }));

        // If it's a complete enrichment, redirect to history with the recording selected
        if (type === 'complete') {
          router.push(`/history?recording=${processing.recordingId}`);
        }
      }
    },
    [processing.transcription, processing.recordingId, router]
  );

  const handleEnrichmentUpdate = useCallback(
    async (enrichmentId: string, content: string) => {
      const response = await api.updateEnrichment(enrichmentId, content);
      if (response.data) {
        setProcessing((prev) => ({
          ...prev,
          enrichments: prev.enrichments.map((e) =>
            e.id === enrichmentId ? { ...e, content } : e
          ),
        }));
      }
    },
    []
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
                <Mic className="w-5 h-5 sm:w-6 sm:h-6 text-dark-950" strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight">
                    <span className="bg-gradient-to-r from-gold-400 via-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
                      EverlastAI
                    </span>
                    <span className="bg-gradient-to-r from-white/90 via-white/70 to-white/90 bg-clip-text text-transparent font-semibold text-sm sm:text-lg ml-1 sm:ml-2">
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
                <p className="text-xs sm:text-sm bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent">
                  Sprachaufnahme & KI-Transkription
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/chat"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-br from-dark-800 via-dark-800 to-dark-850 border border-dark-700/50 text-dark-300 hover:text-white hover:border-gold-500/30 hover:bg-gradient-to-br hover:from-dark-750 hover:via-dark-800 hover:to-dark-850 transition-all duration-200"
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Chat</span>
              </Link>
              <Link
                href="/history"
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-br from-dark-800 via-dark-800 to-dark-850 border border-dark-700/50 text-dark-300 hover:text-white hover:border-gold-500/30 hover:bg-gradient-to-br hover:from-dark-750 hover:via-dark-800 hover:to-dark-850 transition-all duration-200"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Historie</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-12">
        {/* Error Messages */}
        {(recorderError || processing.error) && (
          <div className="mb-4 sm:mb-8">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-red-400 text-sm font-medium mb-2">
                    {recorderError || processing.error || ''}
                  </p>
                  {isElectron && (recorderError?.includes('Mikrofon') || processing.error?.includes('Mikrofon')) && (
                    <button
                      onClick={async () => {
                        await openSystemPreferences();
                      }}
                      className="mt-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-lg text-red-300 text-sm font-medium transition-all duration-200 hover:border-red-500/60"
                    >
                      Systemeinstellungen öffnen
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (recorderError) {
                      resetRecording(); // This will clear the error
                    }
                    setProcessing((prev) => ({ ...prev, error: null }));
                  }}
                  className="text-dark-400 hover:text-white transition-colors"
                  aria-label="Fehlermeldung schließen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recording Section */}
        <section className="mb-4 sm:mb-10">
          <div 
            className="group bg-gradient-to-br from-dark-850 via-dark-850 to-dark-900 border border-dark-700/50 rounded-2xl sm:rounded-3xl p-4 sm:p-10 relative overflow-hidden transition-all duration-300 hover:border-gold-500/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(212,168,83,0.15),0_0_30px_rgba(212,168,83,0.05)]"
            onClick={(e) => {
              // Prevent clicks on container from triggering any actions
              // Only allow clicks on actual buttons
              if (e.target === e.currentTarget) {
                e.stopPropagation();
              }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gold-500/0 via-gold-500/0 to-gold-500/0 group-hover:from-gold-500/5 group-hover:via-gold-500/3 group-hover:to-gold-500/5 transition-all duration-500 pointer-events-none rounded-3xl" />
            <div className="flex flex-col items-center">
              {/* Duration Display */}
              {isRecording && (
                <div className="mb-4 sm:mb-8 text-center w-full transition-smooth animate-fade-in">
                  <span className="text-4xl sm:text-6xl font-light tracking-tight font-mono bg-gradient-to-br from-gold-400 via-gold-300 to-gold-500 bg-clip-text text-transparent transition-all duration-300">
                    {formatDuration(duration)}
                  </span>
                  <p className="text-xs sm:text-sm bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent mt-1 sm:mt-2 font-medium transition-all duration-300">
                    {isPaused ? 'Pausiert' : 'Aufnahme läuft...'}
                  </p>
                  
                  {/* Waveform Visualization */}
                  <div className="mt-3 sm:mt-6 max-w-3xl mx-auto transition-smooth animate-fade-in">
                    <Waveform 
                      audioStream={audioStream} 
                      isRecording={isRecording}
                      isPaused={isPaused}
                    />
                  </div>
                </div>
              )}

              {/* Instruction Text */}
              {!isRecording && !audioUrl && (
                <div className="mb-4 sm:mb-10 text-center max-w-md transition-smooth animate-fade-in">
                  <h2 className="text-lg sm:text-2xl font-semibold mb-2 sm:mb-3 bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent transition-all duration-300">
                    Bereit für die Aufnahme
                  </h2>
                  <p className="text-sm sm:text-base bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent leading-relaxed transition-all duration-300">
                    Klicke auf den Button, um eine Sprachaufnahme zu starten. 
                    Deine Aufnahme wird automatisch transkribiert und kann mit KI angereichert werden.
                  </p>
                  {/* Hotkey Hint for Electron */}
                  {isElectron && (
                    <div className="mt-2 sm:mt-4 flex items-center justify-center gap-2 text-xs sm:text-sm text-dark-500 transition-all duration-300">
                      <Keyboard className="w-3 h-3 sm:w-4 sm:h-4" />
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
              <div className="mb-4 sm:mb-8">
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
                <div className="w-full max-w-lg transition-smooth animate-fade-in">
                  <div className="mb-3 sm:mb-4 text-center">
                    <p className="text-xs sm:text-sm text-dark-400 mb-1">Aufnahmedauer</p>
                    <p className="text-xl sm:text-2xl font-light font-mono text-gold-400">
                      {formatDuration(duration)}
                    </p>
                  </div>
                  <AudioPlayer audioUrl={audioUrl} onReset={handleReset} fallbackDuration={duration} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Process Button */}
        {audioUrl && !isRecording && processing.step === 'idle' && (
          <section className="mb-4 sm:mb-10 transition-smooth animate-fade-in">
            <button
              onClick={processRecording}
              className="w-full py-3 sm:py-5 px-6 sm:px-8 bg-gradient-to-r from-gold-500 via-gold-400 via-gold-500 to-gold-600 text-dark-950 rounded-xl sm:rounded-2xl font-semibold shadow-gold-lg hover:shadow-gold transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-2 sm:gap-3 btn-shine relative overflow-hidden group text-sm sm:text-base"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              Aufnahme verarbeiten & transkribieren
            </button>
          </section>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <section className="mb-4 sm:mb-10 transition-smooth animate-fade-in">
            <div className="bg-gradient-to-br from-dark-850 via-dark-850 to-dark-900 border border-dark-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-8 relative overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 via-transparent to-gold-500/5 pointer-events-none transition-all duration-300" />
              <div className="flex items-center gap-3 sm:gap-5 relative z-10">
                <div className="relative">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-dark-700/50 transition-all duration-300" />
                  <div className="absolute inset-0 w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-gold-500/30 border-t-gold-500 border-r-gold-400 animate-spin transition-all duration-300" />
                </div>
                <div>
                  <p className="font-semibold bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent text-base sm:text-lg transition-all duration-300">
                    {processing.step === 'uploading' && 'Aufnahme wird hochgeladen...'}
                    {processing.step === 'transcribing' && 'Wird transkribiert...'}
                  </p>
                  <p className="text-xs sm:text-sm bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent mt-1 transition-all duration-300">
                    Bitte warten Sie einen Moment
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Transcription Result */}
        {processing.transcription && (
          <section className="mb-4 sm:mb-10 transition-smooth animate-fade-in">
            <TranscriptionCard
              text={processing.transcription.text}
              transcriptionId={processing.transcription.id}
              onEnrich={handleEnrich}
              onUpdate={async (newText: string) => {
                const response = await api.updateTranscription(processing.transcription!.id, newText);
                if (response.data) {
                  setProcessing((prev) => ({
                    ...prev,
                    transcription: response.data!,
                  }));
                }
              }}
              onEnrichmentUpdate={handleEnrichmentUpdate}
              enrichments={processing.enrichments}
              allowManualItems={false}
            />
          </section>
        )}

        {/* New Recording Button (after transcription) */}
        {processing.step === 'done' && (
          <section className="transition-smooth animate-fade-in">
            <button
              onClick={handleReset}
              className="w-full py-4 px-6 bg-gradient-to-br from-dark-800 via-dark-800 to-dark-850 border border-dark-700/50 text-dark-300 rounded-xl font-medium hover:text-white hover:border-gold-500/30 hover:bg-gradient-to-br hover:from-dark-750 hover:via-dark-800 hover:to-dark-850 transition-all duration-300"
            >
              Neue Aufnahme starten
            </button>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="py-4 sm:py-8 text-center border-t border-transparent bg-gradient-to-b from-transparent via-dark-900/50 to-transparent" style={{ borderImage: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.1), transparent) 1' }}>
        <p className="text-xs sm:text-sm bg-gradient-to-r from-dark-500 via-dark-400 to-dark-500 bg-clip-text text-transparent">
          by <span className="bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 bg-clip-text text-transparent font-medium">EverlastAI</span>
        </p>
      </footer>
    </main>
  );
}
