'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { Mic, X } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

// Components
import { StatusMessage, Navigation } from '@/components';
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
 * Empty recordings state – vertikal angeordnet, helle Farben
 */
function EmptyRecordingsState() {
  return (
    <div className="bg-white border border-dark-200 rounded-2xl p-8 sm:p-10 min-h-full flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-dark-100 border border-dark-200 flex items-center justify-center">
          <Mic className="w-7 h-7 text-dark-500" />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-dark-800">Noch keine Aufnahmen</h3>
          <p className="text-sm text-dark-500">Erstelle deine erste Sprachaufnahme</p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-ptw-500 to-ptw-600 text-white font-medium shadow-ptw hover:shadow-ptw-lg transition-all duration-200"
        >
          Aufnahme starten
        </Link>
      </div>
    </div>
  );
}

/**
 * Loading spinner component
 */
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-50/30">
      <div className="text-center">
        <div className="relative mx-auto mb-6">
          <div className="w-16 h-16 rounded-full border-2 border-dark-200" />
          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-ptw-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-dark-500 font-medium">Lade Aufnahmen...</p>
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
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

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
      // Open mobile modal on mobile devices
      if (window.innerWidth < 1024) {
        setIsMobileModalOpen(true);
      }
    },
    [selectRecording]
  );

  // Close mobile modal
  const handleCloseMobileModal = useCallback(() => {
    setIsMobileModalOpen(false);
  }, []);

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

  // Close mobile modal when window is resized to desktop size or when no recording is selected
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && isMobileModalOpen) {
        setIsMobileModalOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileModalOpen]);

  // Close modal when no recording is selected
  useEffect(() => {
    if (!selectedRecording && isMobileModalOpen) {
      setIsMobileModalOpen(false);
    }
  }, [selectedRecording, isMobileModalOpen]);

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
    <div className="min-h-screen bg-dark-50/30">
      {/* Header */}
      <Navigation 
        title="Aufnahmen-Historie"
        subtitle={`${recordings.length} ${recordings.length === 1 ? 'Aufnahme' : 'Aufnahmen'} gespeichert`}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8">
        {error && (
          <div className="mb-4 sm:mb-6">
            <StatusMessage type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recordings List */}
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-10rem)] flex flex-col">
            <div className="overflow-y-auto flex-1 space-y-3 sm:space-y-4 pr-2">
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

          {/* Detail View - Desktop only */}
          <div className="hidden lg:block lg:sticky lg:top-24 lg:h-[calc(100vh-10rem)]">
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

      {/* Mobile Full-Page Modal */}
      {isMobileModalOpen && selectedRecording && (
        <div className="fixed inset-0 z-[100] lg:hidden flex flex-col bg-white">
          {/* Modal Header */}
          <div className="sticky top-0 z-10 border-b border-dark-200 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <h2 className="text-lg font-semibold text-dark-800">Aufnahme-Details</h2>
              <button
                onClick={handleCloseMobileModal}
                className="p-2 rounded-xl bg-dark-100 border border-dark-200 text-dark-600 hover:text-dark-800 hover:border-dark-300 transition-all duration-200"
                aria-label="Modal schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto px-4 py-4">
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
            </div>
          </div>
        </div>
      )}

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
        <div className="min-h-screen bg-dark-50/30 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 border-dark-200 border-t-ptw-500 animate-spin mx-auto mb-4" />
            <p className="text-dark-500">Lädt...</p>
          </div>
        </div>
      }
    >
      <HistoryPageContent />
    </Suspense>
  );
}
