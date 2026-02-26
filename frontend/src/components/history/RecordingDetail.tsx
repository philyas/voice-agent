'use client';

import { useState, useRef, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';
import { AudioPlayer } from '@/components/shared';
import { api } from '@/lib/api';
import { formatDate, formatDuration, formatFileSize } from '@/lib/utils';
import type { Recording, Transcription, Enrichment, ParsedEnrichmentSection } from '@/lib/types';
import { EnrichmentSection } from './EnrichmentSection';

interface RecordingDetailProps {
  recording: Recording;
  transcription: Transcription | null;
  onTitleChange?: (recordingId: string, newTitle: string) => Promise<void>;
  localEnrichments: Enrichment[];
  isTranscriptionExpanded: boolean;
  editingEnrichmentId: string | null;
  editedEnrichmentContent: string;
  savingEnrichment: boolean;
  addingItemTo: { enrichmentId: string; section: string } | null;
  newItemText: string;
  editingItemInfo: { enrichmentId: string; lineIndex: number; text: string } | null;
  parseEnrichmentSections: (content: string) => ParsedEnrichmentSection[];
  onToggleTranscription: () => void;
  onStartEdit: (enrichmentId: string, content: string) => void;
  onSaveEdit: () => Promise<void>;
  onCancelEdit: () => void;
  onEditedContentChange: (content: string) => void;
  onToggleCheckbox: (enrichmentId: string, content: string, checkboxIndex: number) => void;
  onDeleteListItem: (enrichmentId: string, content: string, lineIndex: number) => void;
  onAddingItemToChange: (value: { enrichmentId: string; section: string } | null) => void;
  onNewItemTextChange: (text: string) => void;
  onAddListItem: (enrichmentId: string, content: string, section: string) => void;
  onEditingItemInfoChange: (info: { enrichmentId: string; lineIndex: number; text: string } | null) => void;
  onUpdateListItem: (enrichmentId: string, content: string, lineIndex: number, newText: string) => void;
  onUpdateTextContent: (enrichmentId: string, content: string, startIndex: number, endIndex: number, newText: string) => void;
}

export function RecordingDetail({
  recording,
  transcription,
  onTitleChange,
  localEnrichments,
  isTranscriptionExpanded,
  editingEnrichmentId,
  editedEnrichmentContent,
  savingEnrichment,
  addingItemTo,
  newItemText,
  editingItemInfo,
  parseEnrichmentSections,
  onToggleTranscription,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditedContentChange,
  onToggleCheckbox,
  onDeleteListItem,
  onAddingItemToChange,
  onNewItemTextChange,
  onAddListItem,
  onEditingItemInfoChange,
  onUpdateListItem,
  onUpdateTextContent,
}: RecordingDetailProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState(recording.original_filename);
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditTitleValue(recording.original_filename);
  }, [recording.id, recording.original_filename]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleSaveTitle = async () => {
    const trimmed = editTitleValue.trim();
    if (!trimmed || trimmed === recording.original_filename) {
      setIsEditingTitle(false);
      setEditTitleValue(recording.original_filename);
      return;
    }
    if (!onTitleChange) {
      setIsEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      await onTitleChange(recording.id, trimmed);
      setIsEditingTitle(false);
    } finally {
      setSavingTitle(false);
    }
  };

  const handleCancelTitle = () => {
    setEditTitleValue(recording.original_filename);
    setIsEditingTitle(false);
  };

  return (
    <div
      key={recording.id}
      className="bg-white border border-dark-200 rounded-xl sm:rounded-2xl overflow-hidden h-full flex flex-col transition-smooth animate-fade-in shadow-sm"
    >
      {/* Header only shown on desktop (mobile uses modal header) */}
      <div className="hidden lg:block px-6 py-5 border-b border-dark-200">
        <h2 className="text-lg font-semibold text-dark-800">Aufnahme-Details</h2>
      </div>

      <div className="p-4 sm:p-6 overflow-y-auto flex-1">
        {/* Recording Info */}
        <div className="space-y-4 sm:space-y-5 mb-4 sm:mb-6 transition-smooth">
          <div className="transition-smooth">
            <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
              Überschrift
            </label>
            {isEditingTitle ? (
              <div className="mt-1 flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') handleCancelTitle();
                  }}
                  onBlur={handleSaveTitle}
                  disabled={savingTitle}
                  className="flex-1 min-w-0 px-3 py-2 text-sm sm:text-base text-dark-800 border border-dark-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-ptw-500/50 focus:border-ptw-500/50"
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  disabled={savingTitle || !editTitleValue.trim()}
                  className="p-2 rounded-lg bg-ptw-500 text-white hover:bg-ptw-600 disabled:opacity-50 transition-colors"
                  aria-label="Speichern"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelTitle}
                  disabled={savingTitle}
                  className="p-2 rounded-lg bg-dark-200 text-dark-600 hover:bg-dark-300 transition-colors"
                  aria-label="Abbrechen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2 group">
                <p className="text-sm sm:text-base text-dark-800 flex-1 min-w-0 break-words">
                  {recording.original_filename}
                </p>
                {onTitleChange && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="p-1.5 rounded-lg text-dark-400 hover:text-ptw-600 hover:bg-ptw-500/10 transition-colors flex-shrink-0"
                    aria-label="Überschrift bearbeiten"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                Erstellt am
              </label>
              <p className="text-sm sm:text-base text-dark-800 mt-1">{formatDate(recording.created_at)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                Dauer
              </label>
              <p className="text-sm sm:text-base text-dark-800 mt-1">{formatDuration(recording.duration_ms)}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
              Dateigröße
            </label>
            <p className="text-sm sm:text-base text-dark-800 mt-1">{formatFileSize(recording.file_size)}</p>
          </div>
        </div>

        {/* Audio Player */}
        <div className="mb-4 sm:mb-6 transition-smooth">
          <label className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-2 sm:mb-3 block">
            Audio
          </label>
          <AudioPlayer
            audioUrl={api.getRecordingAudioUrl(recording.id)}
            fallbackDuration={recording.duration_ms ? recording.duration_ms / 1000 : undefined}
          />
        </div>

        {/* Transcription */}
        {transcription ? (
          <div className="border-t border-dark-200 pt-4 sm:pt-6 transition-smooth">
            <button
              onClick={onToggleTranscription}
              className="w-full flex items-center justify-between mb-3 text-sm font-semibold text-dark-800 hover:text-ptw-500 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-ptw-500" />
                Transkription
              </div>
              {isTranscriptionExpanded ? (
                <ChevronUp className="w-4 h-4 transition-transform duration-300" />
              ) : (
                <ChevronDown className="w-4 h-4 transition-transform duration-300" />
              )}
            </button>

            {isTranscriptionExpanded && (
              <div className="bg-dark-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5 transition-smooth animate-fade-in">
                <p className="text-dark-700 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                  {transcription.text}
                </p>
              </div>
            )}

            {/* Enrichments */}
            {localEnrichments && localEnrichments.length > 0 && (
              <div className="transition-smooth">
                <h4 className="text-xs sm:text-sm font-semibold text-dark-800 mb-2 sm:mb-3 transition-all duration-300">
                  Enrichments ({localEnrichments.length})
                </h4>
                <div className="space-y-2 sm:space-y-3">
                  {localEnrichments.map((enrichment, index) => (
                    <EnrichmentSection
                      key={enrichment.id}
                      enrichment={enrichment}
                      isEditing={editingEnrichmentId === enrichment.id}
                      editedContent={editedEnrichmentContent}
                      savingEnrichment={savingEnrichment}
                      addingItemTo={addingItemTo}
                      newItemText={newItemText}
                      editingItemInfo={editingItemInfo}
                      parseEnrichmentSections={parseEnrichmentSections}
                      onStartEdit={onStartEdit}
                      onSaveEdit={onSaveEdit}
                      onCancelEdit={onCancelEdit}
                      onEditedContentChange={onEditedContentChange}
                      onToggleCheckbox={onToggleCheckbox}
                      onDeleteListItem={onDeleteListItem}
                      onAddingItemToChange={onAddingItemToChange}
                      onNewItemTextChange={onNewItemTextChange}
                      onAddListItem={onAddListItem}
                      onEditingItemInfoChange={onEditingItemInfoChange}
                      onUpdateListItem={onUpdateListItem}
                      onUpdateTextContent={onUpdateTextContent}
                      animationDelay={index * 50}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="border-t border-dark-200 pt-6">
            <p className="text-sm text-dark-500">Noch keine Transkription vorhanden</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function RecordingDetailEmpty() {
  return (
    <div className="bg-white border border-dark-200 rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-dark-100 border border-dark-200 flex items-center justify-center">
          <FileText className="w-7 h-7 text-dark-500" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-dark-800 mb-1">Keine Auswahl</h3>
          <p className="text-sm text-dark-500">Wähle eine Aufnahme aus der Liste, um Details anzuzeigen</p>
        </div>
      </div>
    </div>
  );
}

export default RecordingDetail;
