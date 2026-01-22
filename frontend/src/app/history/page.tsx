'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { ArrowLeft, Mic, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Components
import { StatusMessage } from '@/components';
import {
  RecordingListItem,
  RecordingDetail,
  RecordingDetailEmpty,
} from '@/components/history';
import {
  EmailModal,
  GoogleDocsLoadingModal,
  GoogleDocsContentModal,
} from '@/components/modals';

// Hooks
import { useRecordings, useEnrichmentEditor, useShareMenu } from '@/hooks';

// Types
import type { Enrichment } from '@/lib/types';

/**
 * Empty recordings state component
 */
function EmptyRecordingsState() {
  return (
    <div className="bg-dark-850 border border-dark-700 rounded-2xl p-10 text-center flex items-center justify-center min-h-full">
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
  );
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
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

/**
 * Main history page content
 */
function HistoryPageContent() {
  const searchParams = useSearchParams();
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(false);

  // Custom hooks
  const {
    recordings,
    loading,
    error,
    selectedRecording,
    transcription,
    recordingRefs,
    selectRecording,
    deleteRecording,
    setError,
    loadTranscription,
  } = useRecordings();

  const {
    shareMenuOpen,
    shareMenuRef,
    emailModalOpen,
    emailToSend,
    sendingEmail,
    emailSuccess,
    exportingPDF,
    exportingGoogleDocs,
    creatingGoogleDoc,
    googleDocsModalOpen,
    googleDocsContent,
    copiedToClipboard,
    setShareMenuOpen,
    setEmailToSend,
    handleShareClick,
    handleSendEmail,
    handleEmailSubmit,
    closeEmailModal,
    handleExportPDF,
    handleExportGoogleDocs,
    handleCopyToClipboard,
    closeGoogleDocsModal,
  } = useShareMenu();

  const enrichmentEditor = useEnrichmentEditor(
    (transcription?.enrichments as Enrichment[]) || [],
    setError
  );

  // Update local enrichments when transcription changes
  useEffect(() => {
    if (transcription?.enrichments) {
      enrichmentEditor.setLocalEnrichments(transcription.enrichments as Enrichment[]);
    } else {
      enrichmentEditor.setLocalEnrichments([]);
    }
  }, [transcription]);

  // Handle view action
  const handleView = useCallback(
    async (recording: typeof recordings[0]) => {
      setIsTranscriptionExpanded(false);
      await selectRecording(recording);
    },
    [selectRecording]
  );

  // Auto-select recording from query parameter and scroll to it
  useEffect(() => {
    const recordingId = searchParams.get('recording');
    if (recordingId && recordings.length > 0) {
      const recording = recordings.find((r) => r.id === recordingId);
      if (recording && recording.id !== selectedRecording?.id) {
        handleView(recording);

        // Scroll to the recording element after a short delay
        const timeoutId = setTimeout(() => {
          const element = recordingRefs.current.get(recordingId);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }, 100);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [searchParams, recordings, selectedRecording, handleView, recordingRefs]);

  // Email submit handler with error handling
  const onEmailSubmit = async (e: React.FormEvent) => {
    try {
      await handleEmailSubmit(e, selectedRecording);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Versenden der E-Mail');
    }
  };

  // Send email handler
  const onSendEmail = async (recording: typeof recordings[0]) => {
    setShareMenuOpen(null);
    await handleSendEmail(recording, loadTranscription, transcription?.recording_id);
  };

  // Export PDF handler
  const onExportPDF = async (recording: typeof recordings[0]) => {
    try {
      await handleExportPDF(recording);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim PDF-Export');
    }
  };

  // Export Google Docs handler
  const onExportGoogleDocs = async (recording: typeof recordings[0]) => {
    await handleExportGoogleDocs(recording, setError);
  };

  // Copy to clipboard handler
  const onCopyToClipboard = async () => {
    await handleCopyToClipboard(setError);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-dark-700/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
            <Link
              href="/chat"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-dark-800 via-dark-800 to-dark-850 border border-dark-700/50 text-dark-300 hover:text-white hover:border-gold-500/30 hover:bg-gradient-to-br hover:from-dark-750 hover:via-dark-800 hover:to-dark-850 transition-all duration-200"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline text-sm font-medium">AI-Assistant</span>
            </Link>
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
          {/* Recordings List */}
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-10rem)] flex flex-col">
            <div className="overflow-y-auto flex-1 space-y-4 pr-2">
              {recordings.length === 0 ? (
                <EmptyRecordingsState />
              ) : (
                recordings.map((recording) => (
                  <RecordingListItem
                    key={recording.id}
                    recording={recording}
                    isSelected={selectedRecording?.id === recording.id}
                    shareMenuOpen={shareMenuOpen === recording.id}
                    exportingPDF={exportingPDF}
                    exportingGoogleDocs={exportingGoogleDocs}
                    creatingGoogleDoc={creatingGoogleDoc}
                    shareMenuRef={shareMenuRef}
                    onSelect={handleView}
                    onView={handleView}
                    onDelete={deleteRecording}
                    onShareClick={handleShareClick}
                    onSendEmail={onSendEmail}
                    onExportPDF={onExportPDF}
                    onExportGoogleDocs={onExportGoogleDocs}
                    refCallback={(el) => {
                      if (el) {
                        recordingRefs.current.set(recording.id, el);
                      } else {
                        recordingRefs.current.delete(recording.id);
                      }
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Detail View */}
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-10rem)]">
            {selectedRecording ? (
              <RecordingDetail
                recording={selectedRecording}
                transcription={transcription}
                localEnrichments={enrichmentEditor.localEnrichments}
                isTranscriptionExpanded={isTranscriptionExpanded}
                editingEnrichmentId={enrichmentEditor.editingEnrichmentId}
                editedEnrichmentContent={enrichmentEditor.editedEnrichmentContent}
                savingEnrichment={enrichmentEditor.savingEnrichment}
                addingItemTo={enrichmentEditor.addingItemTo}
                newItemText={enrichmentEditor.newItemText}
                editingItemInfo={enrichmentEditor.editingItemInfo}
                parseEnrichmentSections={enrichmentEditor.parseEnrichmentSections}
                onToggleTranscription={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}
                onStartEdit={enrichmentEditor.startEdit}
                onSaveEdit={enrichmentEditor.saveEdit}
                onCancelEdit={enrichmentEditor.cancelEdit}
                onEditedContentChange={enrichmentEditor.setEditedEnrichmentContent}
                onToggleCheckbox={enrichmentEditor.toggleCheckbox}
                onDeleteListItem={enrichmentEditor.deleteListItem}
                onAddingItemToChange={enrichmentEditor.setAddingItemTo}
                onNewItemTextChange={enrichmentEditor.setNewItemText}
                onAddListItem={enrichmentEditor.addListItem}
                onEditingItemInfoChange={enrichmentEditor.setEditingItemInfo}
                onUpdateListItem={enrichmentEditor.updateListItem}
                onUpdateTextContent={enrichmentEditor.updateTextContent}
              />
            ) : (
              <RecordingDetailEmpty />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <EmailModal
        isOpen={emailModalOpen}
        selectedRecording={selectedRecording}
        transcription={transcription}
        emailToSend={emailToSend}
        sendingEmail={sendingEmail}
        emailSuccess={emailSuccess}
        onClose={closeEmailModal}
        onEmailChange={setEmailToSend}
        onSubmit={onEmailSubmit}
      />

      <GoogleDocsLoadingModal
        isOpen={exportingGoogleDocs || creatingGoogleDoc}
        creatingGoogleDoc={creatingGoogleDoc}
      />

      <GoogleDocsContentModal
        isOpen={googleDocsModalOpen}
        content={googleDocsContent}
        copiedToClipboard={copiedToClipboard}
        onClose={closeGoogleDocsModal}
        onCopyToClipboard={onCopyToClipboard}
      />
    </div>
  );
}

/**
 * History page with Suspense boundary
 */
export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-dark-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full border-4 border-dark-700 border-t-gold-500 animate-spin mx-auto mb-4" />
                <p className="text-dark-400">Lädt...</p>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <HistoryPageContent />
    </Suspense>
  );
}
