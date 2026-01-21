'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Calendar, Clock, Trash2, Eye, Mic } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, type Recording, type Transcription } from '@/lib/api';
import { StatusMessage, AudioPlayer } from '@/components';

export default function HistoryPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
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
  };

  const loadTranscription = async (recordingId: string) => {
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
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Möchten Sie diese Aufnahme wirklich löschen?')) return;

    try {
      await api.deleteRecording(id);
      setRecordings(recordings.filter((r) => r.id !== id));
      if (selectedRecording?.id === id) {
        setSelectedRecording(null);
        setTranscription(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
    }
  };

  const handleView = async (recording: Recording) => {
    setSelectedRecording(recording);
    setTranscription(null);
    await loadTranscription(recording.id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-6">
            <div className="w-16 h-16 rounded-full border-2 border-dark-700" />
            <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
          </div>
          <p className="text-dark-400 font-medium">Lade Aufnahmen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-dark-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Aufnahmen-Historie</h1>
              <p className="text-sm text-dark-400">
                {recordings.length} {recordings.length === 1 ? 'Aufnahme' : 'Aufnahmen'} gespeichert
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-8">
        {error && (
          <div className="mb-6">
            <StatusMessage type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste der Aufnahmen */}
          <div className="space-y-4">
            {recordings.length === 0 ? (
              <div className="bg-dark-850 border border-dark-700 rounded-2xl p-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mx-auto mb-5">
                  <Mic className="w-8 h-8 text-dark-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Noch keine Aufnahmen</h3>
                <p className="text-dark-400 mb-6">Erstelle deine erste Sprachaufnahme</p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-dark-950 font-medium shadow-gold hover:shadow-gold-lg transition-all duration-200"
                >
                  Aufnahme starten
                </Link>
              </div>
            ) : (
              recordings.map((recording) => (
                <div
                  key={recording.id}
                  className={`bg-dark-850 border rounded-2xl p-5 transition-all duration-200 cursor-pointer ${
                    selectedRecording?.id === recording.id
                      ? 'border-gold-500/50 shadow-gold'
                      : 'border-dark-700 hover:border-dark-600'
                  }`}
                  onClick={() => handleView(recording)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white mb-2 truncate">
                        {recording.original_filename || recording.filename}
                      </h3>
                      <div className="flex flex-wrap gap-4 text-sm text-dark-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {formatDate(recording.created_at)}
                        </div>
                        {recording.duration_ms && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {formatDuration(recording.duration_ms)}
                          </div>
                        )}
                      </div>
                      {recording.transcription_text && (
                        <span className="inline-flex items-center gap-1 mt-3 text-xs font-medium text-gold-500 bg-gold-500/10 px-2 py-1 rounded-lg">
                          <FileText className="w-3 h-3" />
                          Transkribiert
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(recording);
                        }}
                        className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-400 hover:text-gold-500 hover:border-gold-500/30 transition-all duration-200"
                        aria-label="Anzeigen"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(recording.id);
                        }}
                        className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-400 hover:text-red-500 hover:border-red-500/30 transition-all duration-200"
                        aria-label="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail-Ansicht */}
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-8rem)]">
            {selectedRecording ? (
              <div className="bg-dark-850 border border-dark-700 rounded-2xl overflow-hidden h-full flex flex-col">
                <div className="px-6 py-5 border-b border-dark-700">
                  <h2 className="text-lg font-semibold text-white">Aufnahme-Details</h2>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="space-y-5 mb-6">
                    <div>
                      <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                        Dateiname
                      </label>
                      <p className="text-white mt-1">{selectedRecording.original_filename}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                          Erstellt am
                        </label>
                        <p className="text-white mt-1">{formatDate(selectedRecording.created_at)}</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                          Dauer
                        </label>
                        <p className="text-white mt-1">{formatDuration(selectedRecording.duration_ms)}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                        Dateigröße
                      </label>
                      <p className="text-white mt-1">
                        {(selectedRecording.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  {/* Audio Player */}
                  <div className="mb-6">
                    <label className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-3 block">
                      Audio
                    </label>
                    <AudioPlayer 
                      audioUrl={api.getRecordingAudioUrl(selectedRecording.id)}
                      fallbackDuration={selectedRecording.duration_ms ? selectedRecording.duration_ms / 1000 : undefined}
                    />
                  </div>

                  {transcription ? (
                    <div className="border-t border-dark-700 pt-6">
                      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gold-500" />
                        Transkription
                      </h3>
                      <div className="bg-dark-900/50 rounded-xl p-4 mb-5">
                        <p className="text-dark-300 text-sm leading-relaxed whitespace-pre-wrap">
                          {transcription.text}
                        </p>
                      </div>

                      {transcription.enrichments && transcription.enrichments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-3">
                            Enrichments ({transcription.enrichments.length})
                          </h4>
                          <div className="space-y-3">
                            {transcription.enrichments.map((enrichment) => (
                              <div
                                key={enrichment.id}
                                className="bg-gold-500/5 border border-gold-500/10 rounded-xl p-4"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-gold-500 uppercase tracking-wider">
                                    {enrichment.type}
                                  </span>
                                </div>
                                <div className="prose prose-sm prose-invert max-w-none prose-headings:text-white prose-p:text-dark-300 prose-strong:text-white prose-em:text-dark-200 prose-code:text-gold-400 prose-code:bg-dark-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-dark-900 prose-pre:border prose-pre:border-dark-700 prose-ul:text-dark-300 prose-ol:text-dark-300 prose-li:text-dark-300 prose-a:text-gold-400 prose-a:hover:text-gold-300 prose-blockquote:text-dark-400 prose-blockquote:border-dark-600">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {enrichment.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border-t border-dark-700 pt-6">
                      <p className="text-sm text-dark-500">
                        Noch keine Transkription vorhanden
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-dark-850 border border-dark-700 rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-5">
                  <FileText className="w-8 h-8 text-dark-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Keine Auswahl</h3>
                <p className="text-dark-400">
                  Wähle eine Aufnahme aus der Liste, um Details anzuzeigen
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
