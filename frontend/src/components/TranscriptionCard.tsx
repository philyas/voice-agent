'use client';

import { useState, useEffect } from 'react';
import { FileText, Sparkles, Loader2, Copy, Check, ChevronRight, ChevronDown, ChevronUp, Edit2, Save, X, FilePenLine } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { EnrichmentType } from '@/lib/api';
import { api } from '@/lib/api';

interface TranscriptionCardProps {
  text: string;
  transcriptionId?: string;
  isLoading?: boolean;
  onEnrich?: (type: EnrichmentType) => Promise<void>;
  onUpdate?: (text: string) => Promise<void>;
  enrichments?: Array<{
    type: string;
    content: string;
  }>;
}

const ENRICHMENT_OPTIONS: { type: EnrichmentType; label: string; icon: React.ReactNode; isPrimary?: boolean }[] = [
  { type: 'complete', label: 'Notizen erstellen', icon: <FilePenLine className="w-4 h-4" />, isPrimary: true },
];

export function TranscriptionCard({
  text,
  transcriptionId,
  isLoading = false,
  onEnrich,
  onUpdate,
  enrichments = [],
}: TranscriptionCardProps) {
  const [activeEnrichment, setActiveEnrichment] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(false);
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [editedTranscriptionText, setEditedTranscriptionText] = useState('');
  const [isSavingTranscription, setIsSavingTranscription] = useState(false);
  const [currentText, setCurrentText] = useState(text);

  // Update currentText when text prop changes
  useEffect(() => {
    setCurrentText(text);
  }, [text]);

  const handleEnrich = async (type: EnrichmentType) => {
    if (!onEnrich || loadingType) return;
    
    setLoadingType(type);
    try {
      await onEnrich(type);
      setActiveEnrichment(type);
    } finally {
      setLoadingType(null);
    }
  };

  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEditTranscription = () => {
    setEditedTranscriptionText(currentText);
    setIsEditingTranscription(true);
    setIsTranscriptionExpanded(true);
  };

  const handleCancelEdit = () => {
    setIsEditingTranscription(false);
    setEditedTranscriptionText('');
  };

  const handleSaveTranscription = async () => {
    if (!transcriptionId && !onUpdate) return;

    try {
      setIsSavingTranscription(true);
      
      if (onUpdate) {
        await onUpdate(editedTranscriptionText);
        setCurrentText(editedTranscriptionText);
      } else if (transcriptionId) {
        const response = await api.updateTranscription(transcriptionId, editedTranscriptionText);
        if (response.data) {
          setCurrentText(response.data.text);
        }
      }
      
      setIsEditingTranscription(false);
      setEditedTranscriptionText('');
    } catch (error) {
      console.error('Error saving transcription:', error);
    } finally {
      setIsSavingTranscription(false);
    }
  };

  const activeContent = activeEnrichment
    ? enrichments.find((e) => e.type === activeEnrichment)?.content
    : null;

  return (
    <div className="bg-dark-850 border border-dark-700 rounded-2xl overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between">
        <button
          onClick={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}
          className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center">
            <FileText className="w-5 h-5 text-gold-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Transkription</h3>
          </div>
          {isTranscriptionExpanded ? (
            <ChevronUp className="w-4 h-4 text-dark-400 ml-auto" />
          ) : (
            <ChevronDown className="w-4 h-4 text-dark-400 ml-auto" />
          )}
        </button>
        <button
          onClick={() => handleCopy(activeContent || currentText)}
          className="p-2.5 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 transition-all duration-200 ml-2"
          aria-label="Kopieren"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      {isTranscriptionExpanded && (
        <div className="p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-dark-700" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
              </div>
              <span className="mt-4 text-dark-300 font-medium">Transkribiere...</span>
            </div>
          ) : (
            <>
              {/* Original or Enriched Text */}
              {!activeEnrichment && (
                <div className="mb-4">
                  {isEditingTranscription ? (
                    <div className="space-y-3">
                      <textarea
                        value={editedTranscriptionText}
                        onChange={(e) => setEditedTranscriptionText(e.target.value)}
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg p-3 text-dark-200 text-sm leading-relaxed resize-none focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/50"
                        rows={8}
                        placeholder="Transkription bearbeiten..."
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSavingTranscription}
                          className="px-4 py-2 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <X className="w-4 h-4" />
                          Abbrechen
                        </button>
                        <button
                          onClick={handleSaveTranscription}
                          disabled={isSavingTranscription || editedTranscriptionText.trim() === currentText || (!transcriptionId && !onUpdate)}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-gold-500 to-gold-600 text-dark-950 font-medium shadow-gold hover:shadow-gold-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSavingTranscription ? (
                            <>
                              <div className="w-4 h-4 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                              Speichern...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4" />
                              Speichern
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-dark-200 prose-strong:text-white prose-em:text-dark-300 prose-code:text-gold-400 prose-code:bg-dark-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-dark-900 prose-pre:border prose-pre:border-dark-700 prose-ul:text-dark-200 prose-ol:text-dark-200 prose-li:text-dark-200 prose-a:text-gold-400 prose-a:hover:text-gold-300 prose-blockquote:text-dark-300 prose-blockquote:border-dark-600">
                        <p className="text-dark-200 whitespace-pre-wrap leading-relaxed text-[15px]">
                          {currentText}
                        </p>
                      </div>
                      {(transcriptionId || onUpdate) && (
                        <button
                          onClick={handleEditTranscription}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-gold-500 hover:border-gold-500/30 transition-all duration-200 text-xs font-medium"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Bearbeiten
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Enriched Content */}
              {activeContent && (
                <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-dark-200 prose-strong:text-white prose-em:text-dark-300 prose-code:text-gold-400 prose-code:bg-dark-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-dark-900 prose-pre:border prose-pre:border-dark-700 prose-ul:text-dark-200 prose-ol:text-dark-200 prose-li:text-dark-200 prose-a:text-gold-400 prose-a:hover:text-gold-300 prose-blockquote:text-dark-300 prose-blockquote:border-dark-600">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {activeContent}
                  </ReactMarkdown>
                </div>
              )}

              {/* Back to original button */}
              {activeEnrichment && (
                <button
                  onClick={() => setActiveEnrichment(null)}
                  className="mt-4 flex items-center gap-1 text-sm text-gold-500 hover:text-gold-400 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180" />
                  Original anzeigen
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Enrichment Options */}
      {!isLoading && text && onEnrich && (
        <div className="px-6 py-5 bg-dark-900/50 border-t border-dark-700">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-gold-500" />
            <span className="text-sm font-semibold text-white">KI-Verarbeitung</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ENRICHMENT_OPTIONS.map(({ type, label, icon, isPrimary }) => {
              const hasEnrichment = enrichments.some((e) => e.type === type);
              const isActive = activeEnrichment === type;
              const isLoadingThis = loadingType === type;

              return (
                <button
                  key={type}
                  onClick={() => hasEnrichment ? setActiveEnrichment(type) : handleEnrich(type)}
                  disabled={isLoadingThis}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
                    ${isActive
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-dark-950 shadow-gold'
                      : hasEnrichment
                        ? 'bg-dark-800 border border-gold-500/30 text-gold-400 hover:border-gold-500/50'
                        : isPrimary
                          ? 'bg-gradient-to-r from-gold-500/20 to-gold-600/20 border border-gold-500/40 text-gold-400 hover:from-gold-500/30 hover:to-gold-600/30 hover:border-gold-500/60'
                          : 'bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:border-dark-600'
                    }
                    ${isLoadingThis ? 'opacity-70 cursor-wait' : ''}
                  `}
                >
                  {isLoadingThis ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    icon
                  )}
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
