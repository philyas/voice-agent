'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Keyboard, X, Upload } from 'lucide-react';
import { useAudioRecorder, useElectron, useHotkeyListener } from '@/hooks';
import { RecordButton, AudioPlayer, TranscriptionCard, StatusMessage, Waveform, Navigation } from '@/components';
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

  /** Hochgeladene Audiodatei (Alternative zur Aufnahme) */
  const [uploadedAudio, setUploadedAudio] = useState<{ blob: Blob; url: string; name: string } | null>(null);

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

  const audioToProcess = audioBlob ?? uploadedAudio?.blob;
  const processRecording = useCallback(async () => {
    if (!audioToProcess) return;

    setProcessing((prev) => ({ ...prev, step: 'uploading', error: null }));

    const filename = uploadedAudio?.name ?? `recording-${Date.now()}.webm`;
    try {
      const uploadResponse = await api.uploadRecording(
        audioToProcess,
        filename
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
  }, [audioBlob, uploadedAudio?.blob, uploadedAudio?.name]);

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
    if (uploadedAudio?.url) URL.revokeObjectURL(uploadedAudio.url);
    setUploadedAudio(null);
    setProcessing({
      step: 'idle',
      recordingId: null,
      transcription: null,
      enrichments: [],
      error: null,
    });
  }, [resetRecording, uploadedAudio?.url]);

  const isProcessing = processing.step !== 'idle' && processing.step !== 'done';

  const hasAudio = (audioUrl && !isRecording) || uploadedAudio;
  const canProcess = (audioBlob ?? uploadedAudio?.blob) && !isRecording && processing.step === 'idle';

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setProcessing((prev) => ({ ...prev, error: 'Bitte eine Audiodatei wählen (z.B. MP3, WAV, WebM).' }));
      return;
    }
    const url = URL.createObjectURL(file);
    setUploadedAudio({ blob: file, url, name: file.name });
    setProcessing((prev) => ({ ...prev, error: null }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setProcessing((prev) => ({ ...prev, error: 'Bitte eine Audiodatei ablegen (z.B. MP3, WAV, WebM).' }));
      return;
    }
    const url = URL.createObjectURL(file);
    setUploadedAudio({ blob: file, url, name: file.name });
    setProcessing((prev) => ({ ...prev, error: null }));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  return (
    <main className="min-h-screen relative z-10 flex flex-col">
      {/* Header */}
      <Navigation />

      {/* Main Content */}
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 sm:py-12">
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
            className="bg-white border border-dark-200 rounded-2xl sm:rounded-3xl p-4 sm:p-10 relative overflow-hidden shadow-sm"
            onClick={(e) => {
              // Prevent clicks on container from triggering any actions
              // Only allow clicks on actual buttons
              if (e.target === e.currentTarget) {
                e.stopPropagation();
              }
            }}
          >
            <div className="flex flex-col items-center">
              {/* Duration Display */}
              {isRecording && (
                <div className="mb-4 sm:mb-8 text-center w-full transition-smooth animate-fade-in">
                  <span className="text-4xl sm:text-6xl font-light tracking-tight font-mono bg-gradient-to-br from-ptw-500 via-ptw-400 to-ptw-600 bg-clip-text text-transparent transition-all duration-300">
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

              {/* Bereit für Aufnahme: kompakter Block mit Aufnahme + Upload */}
              {!isRecording && !audioUrl && !uploadedAudio && (
                <div className="w-full max-w-md text-center transition-smooth animate-fade-in">
                  <h2 className="text-base sm:text-lg font-semibold text-dark-800 mb-1">Bereit für die Aufnahme</h2>
                  <p className="text-xs sm:text-sm text-dark-500 mb-4">Sprachaufnahme oder Audiodatei – wird transkribiert und kann angereichert werden.</p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                    <RecordButton
                      isRecording={isRecording}
                      isPaused={isPaused}
                      onStart={startRecording}
                      onStop={stopRecording}
                      onPause={pauseRecording}
                      onResume={resumeRecording}
                      disabled={isProcessing}
                    />
                    <span className="text-xs text-dark-400 hidden sm:inline">oder</span>
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dark-200 bg-dark-50/50 hover:border-dark-300 hover:bg-dark-100/80 text-dark-600 hover:text-dark-800 cursor-pointer transition-colors text-sm font-medium">
                      <Upload className="w-4 h-4" />
                      Audio hochladen
                      <input
                        type="file"
                        accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg,.opus"
                        onChange={handleFileSelect}
                        className="sr-only"
                        aria-label="Audiodatei auswählen"
                      />
                    </label>
                  </div>
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    className="mt-3 rounded-xl border border-dashed border-dark-200 py-3 px-4 text-dark-400 hover:border-dark-300 hover:bg-dark-50/80 transition-colors text-xs"
                  >
                    oder Datei hierher ziehen (MP3, WAV, WebM, M4A, OGG)
                  </div>
                  {isElectron && (
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-dark-400">
                      <Keyboard className="w-3 h-3" />
                      <span>Hotkey: <kbd className="px-1.5 py-0.5 bg-dark-100 border border-dark-200 rounded font-mono text-dark-600">{platform === 'darwin' ? '⌘' : 'Ctrl'}+Shift+V</kbd></span>
                    </p>
                  )}
                </div>
              )}

              {/* Record Button (nur sichtbar während Aufnahme – sonst oben im Block) */}
              {isRecording && (
                <div className="mb-4 sm:mb-6">
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
              )}

              {/* Audio Player (nach Aufnahme oder Upload) */}
              {hasAudio && (
                <div className="w-full max-w-lg transition-smooth animate-fade-in">
                  <div className="mb-3 sm:mb-4 text-center">
                    <p className="text-xs sm:text-sm text-dark-400 mb-1">
                      {uploadedAudio ? 'Hochgeladene Datei' : 'Aufnahmedauer'}
                    </p>
                    <p className="text-xl sm:text-2xl font-light font-mono text-ptw-500">
                      {uploadedAudio ? uploadedAudio.name : formatDuration(duration)}
                    </p>
                  </div>
                  <AudioPlayer
                    audioUrl={audioUrl ?? uploadedAudio!.url}
                    onReset={handleReset}
                    fallbackDuration={uploadedAudio ? undefined : duration}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Process Button */}
        {canProcess && (
          <section className="mb-4 sm:mb-10 transition-smooth animate-fade-in">
            <button
              onClick={processRecording}
              className="w-full py-3 sm:py-5 px-6 sm:px-8 bg-gradient-to-r from-ptw-500 via-ptw-400 via-ptw-500 to-ptw-600 text-white rounded-xl sm:rounded-2xl font-semibold shadow-ptw-lg hover:shadow-ptw transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-2 sm:gap-3 btn-shine relative overflow-hidden group text-sm sm:text-base"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
              Audio verarbeiten & transkribieren
            </button>
          </section>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <section className="mb-4 sm:mb-10 transition-smooth animate-fade-in">
            <div className="bg-gradient-to-br from-dark-850 via-dark-850 to-dark-900 border border-dark-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-8 relative overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-ptw-500/5 via-transparent to-ptw-500/5 pointer-events-none transition-all duration-300" />
              <div className="flex items-center gap-3 sm:gap-5 relative z-10">
                <div className="relative">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-dark-700/50 transition-all duration-300" />
                  <div className="absolute inset-0 w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-ptw-500/30 border-t-ptw-500 border-r-ptw-400 animate-spin transition-all duration-300" />
                </div>
                <div>
                  <p className="font-semibold bg-gradient-to-r from-white via-white/90 to-white bg-clip-text text-transparent text-base sm:text-lg transition-all duration-300">
                    {processing.step === 'uploading' && 'Audio wird hochgeladen...'}
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
              className="w-full py-4 px-6 bg-white border border-dark-200 text-dark-600 rounded-xl font-medium hover:text-ptw-600 hover:border-ptw-500/40 hover:bg-dark-50 transition-all duration-300"
            >
              Neue Aufnahme oder Upload
            </button>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="py-4 sm:py-8 text-center border-t border-dark-200 bg-white dark:border-dark-700 dark:bg-dark-900">
        <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">
          by <span className="text-ptw-500 font-medium">PTW TU Darmstadt</span>
        </p>
      </footer>
    </main>
  );
}
