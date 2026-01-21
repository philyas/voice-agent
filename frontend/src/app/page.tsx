'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mic, Upload, Loader2, History, Sparkles, Keyboard, Monitor, Languages } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useLiveTranscription } from '@/hooks/useLiveTranscription';
import { useLiveTranslation } from '@/hooks/useLiveTranslation';
import { useElectron, useHotkeyListener } from '@/hooks/useElectron';
import { RecordButton, AudioPlayer, TranscriptionCard, StatusMessage, Waveform } from '@/components';
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
    audioStream,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error: recorderError,
  } = useAudioRecorder();

  const {
    liveText,
    isConnected: isTranscribing,
    error: transcriptionError,
    startTranscription,
    stopTranscription,
  } = useLiveTranscription();

  const {
    translatedText,
    isTranslating,
    error: translationError,
    startTranslation,
    stopTranslation,
  } = useLiveTranslation();

  const { isElectron, platform, notifyRecordingState } = useElectron();
  const router = useRouter();

  const [processing, setProcessing] = useState<ProcessingState>({
    step: 'idle',
    recordingId: null,
    transcription: null,
    enrichments: [],
    error: null,
  });

  const [translationEnabled, setTranslationEnabled] = useState(false);

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

  // Start live transcription when recording starts
  useEffect(() => {
    if (isRecording && audioStream && !isPaused) {
      startTranscription(audioStream, 'de');
    } else if (!isRecording || isPaused) {
      stopTranscription();
      stopTranslation();
    }
  }, [isRecording, audioStream, isPaused, startTranscription, stopTranscription, stopTranslation]);

  // Trigger translation when transcription completes (only if enabled)
  useEffect(() => {
    if (translationEnabled && liveText && liveText.trim().length > 0) {
      // Debounce translation to avoid too many requests
      const timeoutId = setTimeout(() => {
        startTranslation(liveText);
      }, 500); // Wait 500ms after last transcription update

      return () => clearTimeout(timeoutId);
    } else if (!translationEnabled) {
      // Stop translation if disabled
      stopTranslation();
    }
  }, [translationEnabled, liveText, startTranslation, stopTranslation]);

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
        {(recorderError || processing.error || transcriptionError) && (
          <div className="mb-8">
            <StatusMessage
              type="error"
              message={recorderError || processing.error || transcriptionError || ''}
              onClose={() => {
                setProcessing((prev) => ({ ...prev, error: null }));
              }}
            />
          </div>
        )}

        {/* Recording Section */}
        <section className="mb-10">
          <div 
            className="group bg-gradient-to-br from-dark-850 via-dark-850 to-dark-900 border border-dark-700/50 rounded-3xl p-10 relative overflow-hidden transition-all duration-300 hover:border-gold-500/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(212,168,83,0.15),0_0_30px_rgba(212,168,83,0.05)]"
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
                <div className="mb-8 text-center w-full transition-smooth animate-fade-in">
                  <span className="text-6xl font-light tracking-tight font-mono bg-gradient-to-br from-gold-400 via-gold-300 to-gold-500 bg-clip-text text-transparent transition-all duration-300">
                    {formatDuration(duration)}
                  </span>
                  <p className="text-sm bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent mt-2 font-medium transition-all duration-300">
                    {isPaused ? 'Pausiert' : 'Aufnahme läuft...'}
                  </p>
                  
                  {/* Waveform Visualization */}
                  <div className="mt-6 max-w-3xl mx-auto transition-smooth animate-fade-in">
                    <Waveform 
                      audioStream={audioStream} 
                      isRecording={isRecording}
                      isPaused={isPaused}
                    />
                  </div>
                  
                  {/* Live Transcription & Translation Display */}
                  {(liveText || isTranscribing) && (
                    <div className="mt-6 max-w-4xl mx-auto transition-smooth animate-fade-in">
                      {/* Translation Toggle */}
                      <div className="flex items-center justify-center gap-3 mb-4">
                        <button
                          onClick={() => setTranslationEnabled(!translationEnabled)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                            translationEnabled
                              ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20'
                              : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:border-dark-600 hover:text-dark-300'
                          }`}
                          aria-label={translationEnabled ? 'Übersetzung deaktivieren' : 'Übersetzung aktivieren'}
                        >
                          <Languages className={`w-4 h-4 transition-all ${translationEnabled ? 'text-blue-400' : 'text-dark-500'}`} />
                          <span className="text-sm font-medium">
                            {translationEnabled ? 'Live-Übersetzung an' : 'Live-Übersetzung aus'}
                          </span>
                        </button>
                      </div>

                      <div className={`grid gap-4 ${translationEnabled ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                        {/* Original Transcription */}
                        <div className="bg-gradient-to-br from-dark-800/80 via-dark-800/60 to-dark-900/80 border border-gold-500/20 rounded-xl p-6 backdrop-blur-sm transition-all duration-300">
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isTranscribing ? 'bg-gold-500 animate-pulse' : 'bg-dark-500'}`} />
                            <p className="text-xs font-medium bg-gradient-to-r from-gold-400/80 to-gold-500/80 bg-clip-text text-transparent">
                              Original
                            </p>
                          </div>
                          <p className="text-base leading-relaxed bg-gradient-to-r from-white/90 via-white/80 to-white/90 bg-clip-text text-transparent transition-all duration-300 min-h-[60px]">
                            {liveText || (isTranscribing ? 'Höre zu...' : '')}
                          </p>
                          {transcriptionError && (
                            <p className="text-xs text-red-400 mt-2">{transcriptionError}</p>
                          )}
                        </div>

                        {/* German Translation - Only shown when enabled */}
                        {translationEnabled && (
                          <div className="bg-gradient-to-br from-dark-800/80 via-dark-800/60 to-dark-900/80 border border-blue-500/20 rounded-xl p-6 backdrop-blur-sm transition-all duration-300">
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isTranslating ? 'bg-blue-500 animate-pulse' : 'bg-dark-500'}`} />
                              <p className="text-xs font-medium bg-gradient-to-r from-blue-400/80 to-blue-500/80 bg-clip-text text-transparent">
                                Deutsch
                              </p>
                            </div>
                            <p className="text-base leading-relaxed bg-gradient-to-r from-white/90 via-white/80 to-white/90 bg-clip-text text-transparent transition-all duration-300 min-h-[60px]">
                              {translatedText || (isTranslating ? 'Übersetze...' : liveText ? 'Warte auf Übersetzung...' : '')}
                            </p>
                            {translationError && (
                              <p className="text-xs text-red-400 mt-2">{translationError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Instruction Text */}
              {!isRecording && !audioUrl && (
                <div className="mb-10 text-center max-w-md transition-smooth animate-fade-in">
                  <h2 className="text-2xl font-semibold mb-3 bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent transition-all duration-300">
                    Bereit für die Aufnahme
                  </h2>
                  <p className="bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent leading-relaxed transition-all duration-300">
                    Klicke auf den Button, um eine Sprachaufnahme zu starten. 
                    Deine Aufnahme wird automatisch transkribiert und kann mit KI angereichert werden.
                  </p>
                  {/* Hotkey Hint for Electron */}
                  {isElectron && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-dark-500 transition-all duration-300">
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
                <div className="w-full max-w-lg transition-smooth animate-fade-in">
                  <div className="mb-4 text-center">
                    <p className="text-sm text-dark-400 mb-1">Aufnahmedauer</p>
                    <p className="text-2xl font-light font-mono text-gold-400">
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
          <section className="mb-10 transition-smooth animate-fade-in">
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
          <section className="mb-10 transition-smooth animate-fade-in">
            <div className="bg-gradient-to-br from-dark-850 via-dark-850 to-dark-900 border border-dark-700/50 rounded-2xl p-8 relative overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 via-transparent to-gold-500/5 pointer-events-none transition-all duration-300" />
              <div className="flex items-center gap-5 relative z-10">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full border-2 border-dark-700/50 transition-all duration-300" />
                  <div className="absolute inset-0 w-14 h-14 rounded-full border-2 border-gold-500/30 border-t-gold-500 border-r-gold-400 animate-spin transition-all duration-300" />
                </div>
                <div>
                  <p className="font-semibold bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent text-lg transition-all duration-300">
                    {processing.step === 'uploading' && 'Aufnahme wird hochgeladen...'}
                    {processing.step === 'transcribing' && 'Wird transkribiert...'}
                  </p>
                  <p className="text-sm bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent mt-1 transition-all duration-300">
                    Bitte warten Sie einen Moment
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Transcription Result */}
        {processing.transcription && (
          <section className="mb-10 transition-smooth animate-fade-in">
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
      <footer className="py-8 text-center border-t border-transparent bg-gradient-to-b from-transparent via-dark-900/50 to-transparent" style={{ borderImage: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.1), transparent) 1' }}>
        <p className="text-sm bg-gradient-to-r from-dark-500 via-dark-400 to-dark-500 bg-clip-text text-transparent">
          by <span className="bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 bg-clip-text text-transparent font-medium">EverlastAI</span>
        </p>
      </footer>
    </main>
  );
}
