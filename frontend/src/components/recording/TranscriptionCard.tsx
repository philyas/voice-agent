'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Sparkles, Loader2, Copy, Check, ChevronRight, ChevronDown, ChevronUp, Edit2, Save, X, FilePenLine, FileText as FileTextIcon, Wand2, List, CheckSquare, Target, Languages, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { EnrichmentType, EnrichmentData } from '@/lib/types';
import { api } from '@/lib/api';
import { LANGUAGES, LIST_ENRICHMENT_TYPES, type Language } from '@/lib/constants';

interface TranscriptionCardProps {
  text: string;
  transcriptionId?: string;
  isLoading?: boolean;
  onEnrich?: (type: EnrichmentType, targetLanguage?: string) => Promise<void>;
  onUpdate?: (text: string) => Promise<void>;
  onEnrichmentUpdate?: (enrichmentId: string, content: string) => Promise<void>;
  enrichments?: EnrichmentData[];
  allowManualItems?: boolean; // Whether to allow manual addition of items for list-type enrichments
}

const ENRICHMENT_OPTIONS: { type: EnrichmentType; label: string; icon: React.ReactNode; isPrimary?: boolean; isTranslation?: boolean; isListType?: boolean }[] = [
  { type: 'complete', label: 'Komplett-Analyse', icon: <FilePenLine className="w-4 h-4" />, isPrimary: true },
  { type: 'summary', label: 'Zusammenfassung', icon: <FileTextIcon className="w-4 h-4" /> },
  { type: 'formatted', label: 'Formatiert', icon: <Wand2 className="w-4 h-4" /> },
  { type: 'notes', label: 'Notizen', icon: <List className="w-4 h-4" />, isListType: true },
  { type: 'action_items', label: 'Aufgaben', icon: <CheckSquare className="w-4 h-4" />, isListType: true },
  { type: 'key_points', label: 'Kernpunkte', icon: <Target className="w-4 h-4" />, isListType: true },
  { type: 'translation', label: 'Übersetzung', icon: <Languages className="w-4 h-4" />, isTranslation: true },
];

export function TranscriptionCard({
  text,
  transcriptionId,
  isLoading = false,
  onEnrich,
  onUpdate,
  onEnrichmentUpdate,
  enrichments = [],
  allowManualItems = true,
}: TranscriptionCardProps) {
  const [activeEnrichment, setActiveEnrichment] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(false);
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [editedTranscriptionText, setEditedTranscriptionText] = useState('');
  const [isSavingTranscription, setIsSavingTranscription] = useState(false);
  const [currentText, setCurrentText] = useState(text);
  const [showTranslationDropdown, setShowTranslationDropdown] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(LANGUAGES[0]);
  const [loadingTargetLanguage, setLoadingTargetLanguage] = useState<string | null>(null);
  const [localEnrichments, setLocalEnrichments] = useState<EnrichmentData[]>(enrichments);
  const [newItemText, setNewItemText] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Handle SSR - only render portal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update currentText when text prop changes
  useEffect(() => {
    setCurrentText(text);
  }, [text]);

  // Update localEnrichments when enrichments prop changes
  useEffect(() => {
    setLocalEnrichments(enrichments);
  }, [enrichments]);

  /**
   * Toggle a checkbox in markdown content
   * Finds the nth checkbox and toggles between [ ] and [x]
   */
  const toggleCheckbox = async (enrichmentId: string | undefined, content: string, checkboxIndex: number) => {
    if (!enrichmentId) return;

    // Find all checkboxes in the content
    const checkboxRegex = /- \[([ x])\]/g;
    let currentIndex = 0;
    
    const newContent = content.replace(checkboxRegex, (match, checkState) => {
      if (currentIndex === checkboxIndex) {
        currentIndex++;
        // Toggle the checkbox
        return checkState === ' ' ? '- [x]' : '- [ ]';
      }
      currentIndex++;
      return match;
    });

    // Update local state immediately for instant feedback
    setLocalEnrichments(prev => 
      prev.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
    );

    // Save to backend
    if (onEnrichmentUpdate) {
      try {
        await onEnrichmentUpdate(enrichmentId, newContent);
      } catch (error) {
        // Revert on error
        setLocalEnrichments(prev => 
          prev.map(e => e.id === enrichmentId ? { ...e, content } : e)
        );
        console.error('Failed to save checkbox state:', error);
      }
    }
  };

  /**
   * Add a new item to a list-type enrichment (action_items, notes, key_points)
   * Creates a new manual enrichment if none exists
   */
  const addItemToEnrichment = async (enrichmentId: string | undefined, content: string, enrichmentType: string, newItem: string) => {
    if (!newItem.trim()) return;

    // Format the new item based on enrichment type
    let formattedItem: string;
    if (enrichmentType === 'action_items') {
      formattedItem = `- [ ] ${newItem.trim()}`;
    } else {
      formattedItem = `- ${newItem.trim()}`;
    }

    // Append to existing content
    const newContent = content.trim() ? `${content.trim()}\n${formattedItem}` : formattedItem;

    // If no enrichment exists, create a manual one
    if (!enrichmentId && transcriptionId) {
      try {
        const response = await api.createManualEnrichment(
          transcriptionId,
          enrichmentType as 'action_items' | 'notes' | 'key_points',
          newContent
        );
        if (response.data) {
          const data = response.data;
          // Add new enrichment to local state
          setLocalEnrichments(prev => [...prev, {
            id: data.id,
            type: data.type,
            content: data.content,
          }]);
        }
      } catch (error) {
        console.error('Failed to create manual enrichment:', error);
      }
    } else if (enrichmentId) {
      // Update local state immediately
      setLocalEnrichments(prev =>
        prev.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
      );

      // Save to backend
      if (onEnrichmentUpdate) {
        try {
          await onEnrichmentUpdate(enrichmentId, newContent);
        } catch (error) {
          // Revert on error
          setLocalEnrichments(prev =>
            prev.map(e => e.id === enrichmentId ? { ...e, content } : e)
          );
          console.error('Failed to add item:', error);
        }
      }
    }

    setNewItemText('');
    setIsAddingItem(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showTranslationDropdown) {
        const target = event.target as Element;
        const dropdownContainer = target.closest('.relative.z-50');
        if (!dropdownContainer) {
          setShowTranslationDropdown(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTranslationDropdown]);

  const handleEnrich = async (type: EnrichmentType, targetLanguage?: string) => {
    if (!onEnrich || loadingType) return;
    
    setLoadingType(type);
    setLoadingTargetLanguage(targetLanguage || null);
    setIsAddingItem(false);
    setNewItemText('');
    try {
      await onEnrich(type, targetLanguage);
      setActiveEnrichment(type);
      setShowTranslationDropdown(false);
    } finally {
      setLoadingType(null);
      setLoadingTargetLanguage(null);
    }
  };

  const handleTranslation = (language: Language) => {
    setSelectedLanguage(language);
    handleEnrich('translation', language.code);
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

  const activeEnrichmentData = activeEnrichment
    ? localEnrichments.find((e) => e.type === activeEnrichment)
    : null;
  const activeContent = activeEnrichmentData?.content || null;
  const activeEnrichmentId = activeEnrichmentData?.id;

  // Get the enrichment label for loading modal
  const loadingEnrichment = loadingType ? ENRICHMENT_OPTIONS.find(opt => opt.type === loadingType) : null;
  const loadingLanguage = loadingTargetLanguage ? LANGUAGES.find(lang => lang.code === loadingTargetLanguage) : null;
  const loadingLabel = loadingType === 'translation' && loadingLanguage
    ? `Übersetzung ins ${loadingLanguage.name}`
    : loadingEnrichment?.label || 'Verarbeite Transkription';

  return (
    <>
      {/* Loading Overlay Modal - Rendered via Portal to body */}
      {mounted && loadingType && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-dark-300 rounded-2xl p-8 max-w-md w-full mx-4 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full border-2 border-dark-200" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-ptw-500 border-t-transparent animate-spin" />
              </div>
              <h3 className="text-xl font-semibold text-dark-900 mb-2">
                KI-Verarbeitung läuft...
              </h3>
              <p className="text-dark-600 text-sm mb-1">
                {loadingLabel}
              </p>
              <p className="text-dark-500 text-xs">
                Bitte warten Sie, während die KI die Inhalte generiert
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-white border border-dark-300 rounded-2xl animate-fade-in-up shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-200 flex items-center justify-between overflow-hidden rounded-t-2xl">
        <button
          onClick={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}
          className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-dark-100 border border-dark-300 flex items-center justify-center">
            <FileText className="w-5 h-5 text-ptw-500" />
          </div>
          <div>
            <h3 className="font-semibold text-dark-900">Transkription</h3>
          </div>
          {isTranscriptionExpanded ? (
            <ChevronUp className="w-4 h-4 text-dark-500 ml-auto" />
          ) : (
            <ChevronDown className="w-4 h-4 text-dark-500 ml-auto" />
          )}
        </button>
        <button
          onClick={() => handleCopy(activeContent || currentText)}
          className="p-2.5 rounded-lg bg-dark-100 border border-dark-300 text-dark-600 hover:text-ptw-600 hover:border-ptw-400/60 transition-all duration-200 ml-2"
          aria-label="Kopieren"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      {isTranscriptionExpanded && (
        <div className="p-6 overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-dark-200" />
                <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-ptw-500 border-t-transparent animate-spin" />
              </div>
              <span className="mt-4 text-dark-600 font-medium">Transkribiere...</span>
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
                        className="w-full bg-white border border-dark-300 rounded-lg p-3 text-dark-800 text-sm leading-relaxed resize-none focus:outline-none focus:border-ptw-500/50 focus:ring-1 focus:ring-ptw-500/50"
                        rows={8}
                        placeholder="Transkription bearbeiten..."
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSavingTranscription}
                          className="px-4 py-2 rounded-lg bg-white border border-dark-300 text-dark-600 hover:text-ptw-600 hover:border-ptw-400/60 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
                        >
                          <X className="w-4 h-4" />
                          Abbrechen
                        </button>
                        <button
                          onClick={handleSaveTranscription}
                          disabled={isSavingTranscription || editedTranscriptionText.trim() === currentText || (!transcriptionId && !onUpdate)}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-ptw-500 to-ptw-600 text-white font-medium shadow-ptw hover:shadow-ptw-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isSavingTranscription ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
                      <div className="prose max-w-none prose-headings:text-dark-900 prose-p:text-dark-700 prose-strong:text-dark-900 prose-em:text-dark-600 prose-code:text-ptw-600 prose-code:bg-dark-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-dark-100 prose-pre:border prose-pre:border-dark-300 prose-ul:text-dark-700 prose-ol:text-dark-700 prose-li:text-dark-700 prose-a:text-ptw-600 prose-a:hover:text-ptw-500 prose-blockquote:text-dark-600 prose-blockquote:border-dark-300">
                        <p className="text-dark-700 whitespace-pre-wrap leading-relaxed text-[15px]">
                          {currentText}
                        </p>
                      </div>
                      {(transcriptionId || onUpdate) && (
                        <button
                          onClick={handleEditTranscription}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-100 border border-dark-300 text-dark-600 hover:text-ptw-600 hover:border-ptw-400/60 transition-all duration-200 text-xs font-medium"
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
              {(activeContent || (activeEnrichment && LIST_ENRICHMENT_TYPES.includes(activeEnrichment as typeof LIST_ENRICHMENT_TYPES[number]))) && (
                <div className="enrichment-content prose max-w-none prose-headings:text-dark-900 prose-p:text-dark-700 prose-strong:text-dark-900 prose-em:text-dark-600 prose-code:text-ptw-600 prose-code:bg-dark-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-dark-100 prose-pre:border prose-pre:border-dark-300 prose-ul:text-dark-700 prose-ol:text-dark-700 prose-li:text-dark-700 prose-a:text-ptw-600 prose-a:hover:text-ptw-500 prose-blockquote:text-dark-600 prose-blockquote:border-dark-300">
                  {activeContent && <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Custom list item to handle checkbox clicks
                      li: ({ children, className, node, ...props }) => {
                        const isTaskItem = className?.includes('task-list-item');
                        
                        if (isTaskItem && activeEnrichmentId) {
                          return (
                            <li 
                              className={`${className || ''} cursor-pointer hover:bg-dark-100 rounded px-1 -mx-1 transition-colors`}
                              onClick={(e) => {
                                e.preventDefault();
                                // Find the checkbox index
                                const container = (e.currentTarget as HTMLElement).closest('.enrichment-content');
                                if (container) {
                                  const allTaskItems = container.querySelectorAll('.task-list-item');
                                  const idx = Array.from(allTaskItems).indexOf(e.currentTarget as HTMLElement);
                                  if (idx !== -1) {
                                    toggleCheckbox(activeEnrichmentId, activeContent, idx);
                                  }
                                }
                              }}
                              {...props}
                            >
                              {children}
                            </li>
                          );
                        }
                        
                        return <li className={className} {...props}>{children}</li>;
                      },
                      // Style checkboxes
                      input: ({ type, checked, disabled, ...props }) => {
                        if (type === 'checkbox') {
                          return (
                            <input
                              type="checkbox"
                              checked={checked}
                              readOnly
                              className="w-4 h-4 rounded border-dark-400 bg-white text-ptw-500 focus:ring-ptw-500 focus:ring-offset-white cursor-pointer pointer-events-none"
                              {...props}
                            />
                          );
                        }
                        return <input type={type} checked={checked} disabled={disabled} {...props} />;
                      },
                    }}
                  >
                    {activeContent}
                  </ReactMarkdown>}

                  {/* Empty state message for list-type enrichments */}
                  {!activeContent && activeEnrichment && LIST_ENRICHMENT_TYPES.includes(activeEnrichment as typeof LIST_ENRICHMENT_TYPES[number]) && (
                    <p className="text-dark-500 text-sm italic mb-4">
                      {activeEnrichment === 'action_items' ? 'Keine Aufgaben vorhanden.' :
                       activeEnrichment === 'notes' ? 'Keine Notizen vorhanden.' :
                       activeEnrichment === 'key_points' ? 'Keine Kernpunkte vorhanden.' : 
                       'Keine Einträge vorhanden.'}
                    </p>
                  )}

                  {/* Add item button for list-type enrichments - only if allowManualItems is true */}
                  {allowManualItems && LIST_ENRICHMENT_TYPES.includes(activeEnrichment as typeof LIST_ENRICHMENT_TYPES[number]) && (activeEnrichmentId || transcriptionId) && (
                    <div className={activeContent ? "mt-4 pt-4 border-t border-dark-200" : ""}>
                      {isAddingItem ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newItemText}
                            onChange={(e) => setNewItemText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newItemText.trim() && activeEnrichment) {
                                addItemToEnrichment(activeEnrichmentId, activeContent || '', activeEnrichment, newItemText);
                              } else if (e.key === 'Escape') {
                                setIsAddingItem(false);
                                setNewItemText('');
                              }
                            }}
                            placeholder={
                              activeEnrichment === 'action_items' ? 'Neue Aufgabe...' :
                              activeEnrichment === 'notes' ? 'Neue Notiz...' :
                              activeEnrichment === 'key_points' ? 'Neuer Kernpunkt...' : 'Neuer Eintrag...'
                            }
                            className="flex-1 bg-white border border-dark-300 rounded-lg px-3 py-2 text-sm text-dark-800 placeholder-dark-500 focus:outline-none focus:border-ptw-500/50 focus:ring-1 focus:ring-ptw-500/50"
                            autoFocus
                          />
                          <button
                            onClick={() => activeEnrichment && addItemToEnrichment(activeEnrichmentId, activeContent || '', activeEnrichment, newItemText)}
                            disabled={!newItemText.trim()}
                            className="px-3 py-2 rounded-lg bg-gradient-to-r from-ptw-500 to-ptw-600 text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-ptw transition-all"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setIsAddingItem(false);
                              setNewItemText('');
                            }}
                            className="px-3 py-2 rounded-lg bg-white border border-dark-300 text-dark-600 hover:text-ptw-600 hover:border-ptw-400/60 transition-all shadow-sm"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setIsAddingItem(true)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-100 border border-dark-300 text-dark-600 hover:text-ptw-600 hover:border-ptw-400/60 transition-all duration-200 text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          {activeEnrichment === 'action_items' ? 'Aufgabe hinzufügen' :
                           activeEnrichment === 'notes' ? 'Notiz hinzufügen' :
                           activeEnrichment === 'key_points' ? 'Kernpunkt hinzufügen' : 'Hinzufügen'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Back to original button */}
              {activeEnrichment && (
                <button
                  onClick={() => {
                    setActiveEnrichment(null);
                    setIsAddingItem(false);
                    setNewItemText('');
                  }}
                  className="mt-4 flex items-center gap-1 text-sm text-ptw-500 hover:text-ptw-400 transition-colors"
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
        <div className="px-6 py-5 bg-dark-50 border-t border-dark-200 overflow-visible rounded-b-2xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-ptw-500" />
            <span className="text-sm font-semibold text-dark-900">KI-Verarbeitung</span>
          </div>
          <div className="flex flex-wrap gap-2 relative">
            {ENRICHMENT_OPTIONS.map(({ type, label, icon, isPrimary, isTranslation }) => {
              if (isTranslation) {
                // Translation dropdown
                const translationEnrichments = localEnrichments.filter((e) => e.type === 'translation');
                const isLoadingTranslation = loadingType === 'translation';

                return (
                  <div key={type} className="relative z-50">
                    <button
                      onClick={() => setShowTranslationDropdown(!showTranslationDropdown)}
                      disabled={isLoadingTranslation}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
                        ${translationEnrichments.length > 0
                          ? 'bg-white border border-ptw-500/40 text-ptw-600 hover:border-ptw-500/60 shadow-sm'
                          : 'bg-white border border-dark-300 text-dark-600 hover:text-ptw-600 hover:border-ptw-400/60 shadow-sm'
                        }
                        ${isLoadingTranslation ? 'opacity-70 cursor-wait' : ''}
                      `}
                    >
                      {isLoadingTranslation ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          {icon}
                          {label}
                          <ChevronDown className="w-3 h-3 ml-1" />
                        </>
                      )}
                    </button>
                    {showTranslationDropdown && !isLoadingTranslation && (
                      <div className="absolute top-full left-0 mt-2 bg-white border border-dark-300 rounded-xl shadow-xl z-[100] min-w-[200px] max-h-64 overflow-y-auto">
                        {LANGUAGES.map((lang) => {
                          const hasLangEnrichment = translationEnrichments.some((e) => e.type === 'translation');
                          return (
                            <button
                              key={lang.code}
                              onClick={() => handleTranslation(lang)}
                              className="w-full px-4 py-2.5 text-left text-sm text-dark-700 hover:text-ptw-600 hover:bg-dark-50 flex items-center gap-3 transition-colors first:rounded-t-xl last:rounded-b-xl"
                            >
                              <span className="text-lg">{lang.flag}</span>
                              <span>{lang.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Regular buttons
              const hasEnrichment = localEnrichments.some((e) => e.type === type);
              const isActive = activeEnrichment === type;
              const isLoadingThis = loadingType === type;

              return (
                <button
                  key={type}
                  onClick={() => {
                    setIsAddingItem(false);
                    setNewItemText('');
                    // If enrichment exists, show it; otherwise trigger AI generation
                    hasEnrichment ? setActiveEnrichment(type) : handleEnrich(type);
                  }}
                  disabled={isLoadingThis}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
                    ${isActive
                      ? 'bg-gradient-to-r from-ptw-500 to-ptw-600 text-white shadow-ptw'
                      : hasEnrichment
                        ? 'bg-white border border-ptw-500/40 text-ptw-600 hover:border-ptw-500/60 shadow-sm'
                        : isPrimary
                          ? 'bg-gradient-to-r from-ptw-500/15 to-ptw-600/15 border border-ptw-500/50 text-ptw-600 hover:from-ptw-500/25 hover:to-ptw-600/25 hover:border-ptw-500/70 shadow-sm'
                          : 'bg-white border border-dark-300 text-dark-600 hover:text-ptw-600 hover:border-ptw-400/60 shadow-sm'
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
    </>
  );
}
