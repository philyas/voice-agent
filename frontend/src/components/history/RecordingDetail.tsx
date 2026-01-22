'use client';

import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { AudioPlayer } from '@/components';
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
      className="bg-dark-850 border border-dark-700 rounded-2xl overflow-hidden h-full flex flex-col transition-smooth animate-fade-in"
    >
      <div className="px-6 py-5 border-b border-dark-700">
        <h2 className="text-lg font-semibold text-white">Aufnahme-Details</h2>
      </div>

      <div className="p-6 overflow-y-auto flex-1">
        {/* Recording Info */}
        <div className="space-y-5 mb-6 transition-smooth">
          <div className="transition-smooth">
            <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
              Dateiname
            </label>
            <p className="text-white mt-1 transition-all duration-300">
              {recording.original_filename}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                Erstellt am
              </label>
              <p className="text-white mt-1">{formatDate(recording.created_at)}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                Dauer
              </label>
              <p className="text-white mt-1">{formatDuration(recording.duration_ms)}</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
              Dateigröße
            </label>
            <p className="text-white mt-1">{formatFileSize(recording.file_size)}</p>
          </div>
        </div>

        {/* Audio Player */}
        <div className="mb-6 transition-smooth">
          <label className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-3 block">
            Audio
          </label>
          <AudioPlayer
            audioUrl={api.getRecordingAudioUrl(recording.id)}
            fallbackDuration={recording.duration_ms ? recording.duration_ms / 1000 : undefined}
          />
        </div>

        {/* Transcription */}
        {transcription ? (
          <div className="border-t border-dark-700 pt-6 transition-smooth">
            <button
              onClick={onToggleTranscription}
              className="w-full flex items-center justify-between mb-3 text-sm font-semibold text-white hover:text-gold-500 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gold-500" />
                Transkription
              </div>
              {isTranscriptionExpanded ? (
                <ChevronUp className="w-4 h-4 transition-transform duration-300" />
              ) : (
                <ChevronDown className="w-4 h-4 transition-transform duration-300" />
              )}
            </button>

            {isTranscriptionExpanded && (
              <div className="bg-dark-900/50 rounded-xl p-4 mb-5 transition-smooth animate-fade-in">
                <p className="text-dark-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {transcription.text}
                </p>
              </div>
            )}

            {/* Enrichments */}
            {localEnrichments && localEnrichments.length > 0 && (
              <div className="transition-smooth">
                <h4 className="text-sm font-semibold text-white mb-3 transition-all duration-300">
                  Enrichments ({localEnrichments.length})
                </h4>
                <div className="space-y-3">
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
          <div className="border-t border-dark-700 pt-6">
            <p className="text-sm text-dark-500">Noch keine Transkription vorhanden</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function RecordingDetailEmpty() {
  return (
    <div className="bg-dark-850 border border-dark-700 rounded-2xl p-10 text-center h-full flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center mb-5">
        <FileText className="w-8 h-8 text-dark-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Keine Auswahl</h3>
      <p className="text-dark-400">Wähle eine Aufnahme aus der Liste, um Details anzuzeigen</p>
    </div>
  );
}

export default RecordingDetail;
