'use client';

import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { AudioPlayer } from '@/components/shared';
import { api } from '@/lib/api';
import { formatDate, formatDuration, formatFileSize } from '@/lib/utils';
import type { Recording, Transcription, Enrichment, ParsedEnrichmentSection } from '@/lib/types';
import { EnrichmentSection } from './EnrichmentSection';

interface RecordingDetailProps {
  recording: Recording;
  transcription: Transcription | null;
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
              Dateiname
            </label>
            <p className="text-sm sm:text-base text-dark-800 mt-1 transition-all duration-300 break-words">
              {recording.original_filename}
            </p>
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
