'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, FileText, Calendar, Clock, Trash2, Eye, Mic, ChevronDown, ChevronUp, Mail, X, Edit2, Save, Plus, Check } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api, type Recording, type Transcription } from '@/lib/api';
import { StatusMessage, AudioPlayer } from '@/components';

export default function HistoryPage() {
  const searchParams = useSearchParams();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [transcription, setTranscription] = useState<Transcription | null>(null);
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [localEnrichments, setLocalEnrichments] = useState<Transcription['enrichments']>([]);
  const [editingEnrichmentId, setEditingEnrichmentId] = useState<string | null>(null);
  const [editedEnrichmentContent, setEditedEnrichmentContent] = useState<string>('');
  const [savingEnrichment, setSavingEnrichment] = useState(false);
  // State for inline list item editing
  const [addingItemTo, setAddingItemTo] = useState<{ enrichmentId: string; section: string } | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [editingItemInfo, setEditingItemInfo] = useState<{ enrichmentId: string; lineIndex: number; text: string } | null>(null);

  useEffect(() => {
    loadRecordings();
  }, []);

  // Update localEnrichments when transcription changes
  useEffect(() => {
    if (transcription?.enrichments) {
      setLocalEnrichments(transcription.enrichments);
    } else {
      setLocalEnrichments([]);
    }
  }, [transcription]);

  /**
   * Toggle a checkbox in markdown content
   */
  const toggleCheckbox = async (enrichmentId: string, content: string, checkboxIndex: number) => {
    const checkboxRegex = /- \[([ x])\]/g;
    let currentIndex = 0;
    
    const newContent = content.replace(checkboxRegex, (match, checkState) => {
      if (currentIndex === checkboxIndex) {
        currentIndex++;
        return checkState === ' ' ? '- [x]' : '- [ ]';
      }
      currentIndex++;
      return match;
    });

    // Update local state immediately
    setLocalEnrichments(prev => 
      prev?.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
    );

    // Save to backend
    try {
      await api.updateEnrichment(enrichmentId, newContent);
    } catch (error) {
      // Revert on error
      setLocalEnrichments(prev => 
        prev?.map(e => e.id === enrichmentId ? { ...e, content } : e)
      );
      console.error('Failed to save checkbox state:', error);
    }
  };

  /**
   * Start editing an enrichment
   */
  const handleStartEdit = (enrichmentId: string, currentContent: string) => {
    setEditingEnrichmentId(enrichmentId);
    setEditedEnrichmentContent(currentContent);
  };

  /**
   * Cancel editing
   */
  const handleCancelEdit = () => {
    setEditingEnrichmentId(null);
    setEditedEnrichmentContent('');
  };

  /**
   * Save edited enrichment
   */
  const handleSaveEdit = async () => {
    if (!editingEnrichmentId || !editedEnrichmentContent.trim()) return;

    setSavingEnrichment(true);
    try {
      const response = await api.updateEnrichment(editingEnrichmentId, editedEnrichmentContent);
      if (response.data) {
        setLocalEnrichments(prev => 
          prev?.map(e => e.id === editingEnrichmentId ? { ...e, content: editedEnrichmentContent } : e)
        );
        setEditingEnrichmentId(null);
        setEditedEnrichmentContent('');
      }
    } catch (error) {
      console.error('Failed to save enrichment:', error);
      setError('Fehler beim Speichern des Enrichments');
    } finally {
      setSavingEnrichment(false);
    }
  };

  /**
   * Delete a list item from enrichment content
   */
  const deleteListItem = async (enrichmentId: string, content: string, lineIndex: number) => {
    const lines = content.split('\n');
    const newLines = lines.filter((_, idx) => idx !== lineIndex);
    const newContent = newLines.join('\n');

    // Update local state immediately
    setLocalEnrichments(prev => 
      prev?.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
    );

    // Save to backend
    try {
      await api.updateEnrichment(enrichmentId, newContent);
    } catch (error) {
      // Revert on error
      setLocalEnrichments(prev => 
        prev?.map(e => e.id === enrichmentId ? { ...e, content } : e)
      );
      console.error('Failed to delete item:', error);
    }
  };

  /**
   * Add a new list item to a section
   */
  const addListItem = async (enrichmentId: string, content: string, section: string) => {
    if (!newItemText.trim()) {
      setAddingItemTo(null);
      setNewItemText('');
      return;
    }

    const lines = content.split('\n');
    let insertIndex = -1;
    let isInSection = false;
    let listPrefix = '- ';
    let lastNumber = 0;

    // Determine default prefix based on section title
    const sectionLower = section.toLowerCase();
    if (sectionLower.includes('aufgaben') || sectionLower.includes('todos') || sectionLower.includes('to-dos')) {
      listPrefix = '- [ ] ';
    } else if (sectionLower.includes('kernpunkte') || sectionLower.includes('key points')) {
      listPrefix = '1. ';
    } else if (sectionLower.includes('notizen') || sectionLower.includes('notes') || sectionLower.includes('anmerkungen')) {
      listPrefix = '- [ ] ';
    } else {
      listPrefix = '- ';
    }

    // Find the section and determine where to insert
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if we're entering the target section
      if (line.startsWith('## ') && line.toLowerCase().includes(sectionLower)) {
        isInSection = true;
        insertIndex = i + 1; // Default: insert right after section header
        continue;
      }
      
      // Check if we're leaving the section (next ## header)
      if (isInSection && line.startsWith('## ')) {
        insertIndex = i;
        break;
      }
      
      // Determine the list style from existing items
      if (isInSection) {
        if (line.match(/^- \[[ x]\]/)) {
          listPrefix = '- [ ] ';
        } else if (line.match(/^\d+\./)) {
          // Numbered list - find the last number
          const match = line.match(/^(\d+)\./);
          if (match) {
            lastNumber = parseInt(match[1]);
            listPrefix = `${lastNumber + 1}. `;
          }
        } else if (line.startsWith('- ')) {
          listPrefix = '- ';
        }
        
        // Track the last list item position
        if (line.match(/^(-|\d+\.)\s/)) {
          insertIndex = i + 1;
        }
      }
    }

    // If no insert position found, add at the end
    if (insertIndex === -1) {
      insertIndex = lines.length;
    }

    // Insert the new item
    const newItem = `${listPrefix}${newItemText.trim()}`;
    lines.splice(insertIndex, 0, newItem);
    const newContent = lines.join('\n');

    // Update local state immediately
    setLocalEnrichments(prev => 
      prev?.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
    );

    // Reset adding state
    setAddingItemTo(null);
    setNewItemText('');

    // Save to backend
    try {
      await api.updateEnrichment(enrichmentId, newContent);
    } catch (error) {
      // Revert on error
      setLocalEnrichments(prev => 
        prev?.map(e => e.id === enrichmentId ? { ...e, content } : e)
      );
      console.error('Failed to add item:', error);
    }
  };

  /**
   * Update an existing list item
   */
  const updateListItem = async (enrichmentId: string, content: string, lineIndex: number, newText: string) => {
    if (!newText.trim()) {
      setEditingItemInfo(null);
      return;
    }

    const lines = content.split('\n');
    const oldLine = lines[lineIndex];
    
    // Preserve the list prefix (-, [ ], [x], 1., etc.)
    const prefixMatch = oldLine.match(/^(-\s*\[[ x]\]\s*|-\s*|\d+\.\s*)/);
    const prefix = prefixMatch ? prefixMatch[1] : '- ';
    
    lines[lineIndex] = `${prefix}${newText.trim()}`;
    const newContent = lines.join('\n');

    // Update local state immediately
    setLocalEnrichments(prev => 
      prev?.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
    );

    // Reset editing state
    setEditingItemInfo(null);

    // Save to backend
    try {
      await api.updateEnrichment(enrichmentId, newContent);
    } catch (error) {
      // Revert on error
      setLocalEnrichments(prev => 
        prev?.map(e => e.id === enrichmentId ? { ...e, content } : e)
      );
      console.error('Failed to update item:', error);
    }
  };

  /**
   * Update text content (for non-list sections like summary)
   */
  const updateTextContent = async (enrichmentId: string, content: string, startIndex: number, endIndex: number, newText: string) => {
    const lines = content.split('\n');
    
    // Replace the text block
    const newLines = [...lines];
    for (let i = startIndex; i <= endIndex; i++) {
      if (i === startIndex) {
        newLines[i] = newText;
      } else {
        newLines[i] = '';
      }
    }
    
    // Remove empty lines in the replaced section
    const cleanedLines = newLines.filter((line, idx) => {
      if (idx >= startIndex && idx <= endIndex) {
        return idx === startIndex || line.trim() !== '';
      }
      return true;
    });
    
    const newContent = cleanedLines.join('\n');

    // Update local state immediately
    setLocalEnrichments(prev => 
      prev?.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
    );

    // Reset editing state
    setEditingItemInfo(null);

    // Save to backend
    try {
      await api.updateEnrichment(enrichmentId, newContent);
    } catch (error) {
      // Revert on error
      setLocalEnrichments(prev => 
        prev?.map(e => e.id === enrichmentId ? { ...e, content } : e)
      );
      console.error('Failed to update text content:', error);
    }
  };

  /**
   * Parse enrichment content into sections for rendering
   */
  const parseEnrichmentSections = (content: string) => {
    const lines = content.split('\n');
    const sections: { 
      title: string; 
      items: { text: string; lineIndex: number; isCheckbox: boolean; isChecked: boolean; isNumbered: boolean }[];
      textContent: string; // For non-list sections like summary
      textStartIndex: number;
      textEndIndex: number;
      isListSection: boolean;
    }[] = [];
    let currentSection: typeof sections[0] | null = null;
    let textStartIndex = -1;

    lines.forEach((line, index) => {
      if (line.startsWith('## ')) {
        // Save previous section
        if (currentSection) {
          // If there was text content, save it
          if (textStartIndex !== -1 && currentSection.textStartIndex === -1) {
            currentSection.textStartIndex = textStartIndex;
            currentSection.textEndIndex = index - 1;
          }
          
          // Mark as list section if title suggests it's a list section (even if empty)
          const listSectionKeywords = ['aufgaben', 'todos', 'to-dos', 'kernpunkte', 'notizen', 'anmerkungen', 'action items', 'key points', 'notes'];
          const titleLower = currentSection.title.toLowerCase();
          if (listSectionKeywords.some(keyword => titleLower.includes(keyword))) {
            currentSection.isListSection = true;
          }
          
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          title: line.replace('## ', '').trim(),
          items: [],
          textContent: '',
          textStartIndex: -1,
          textEndIndex: -1,
          isListSection: false
        };
        textStartIndex = -1;
      } else if (currentSection) {
        // Check if it's a list item
        if (line.match(/^(-|\d+\.)\s/)) {
          // If we were collecting text, save it first
          if (textStartIndex !== -1 && currentSection.textStartIndex === -1) {
            currentSection.textStartIndex = textStartIndex;
            currentSection.textEndIndex = index - 1;
            currentSection.textContent = lines.slice(textStartIndex, index).join('\n').trim();
            textStartIndex = -1;
          }
          
          // Mark as list section
          currentSection.isListSection = true;
          
          const isCheckbox = /^- \[[ x]\]/.test(line);
          const isChecked = /^- \[x\]/.test(line);
          const isNumbered = /^\d+\./.test(line);
          
          // Extract text without prefix
          let text = line;
          if (isCheckbox) {
            text = line.replace(/^- \[[ x]\]\s*/, '');
          } else if (isNumbered) {
            text = line.replace(/^\d+\.\s*/, '');
          } else {
            text = line.replace(/^-\s*/, '');
          }

          currentSection.items.push({
            text,
            lineIndex: index,
            isCheckbox,
            isChecked,
            isNumbered
          });
        } else if (line.trim() !== '') {
          // It's a text line (not empty, not a header, not a list)
          if (textStartIndex === -1) {
            textStartIndex = index;
          }
        } else if (line.trim() === '' && textStartIndex !== -1) {
          // Empty line after text - save the text block
          if (currentSection.textStartIndex === -1) {
            currentSection.textStartIndex = textStartIndex;
            currentSection.textEndIndex = index - 1;
            currentSection.textContent = lines.slice(textStartIndex, index).join('\n').trim();
            textStartIndex = -1;
          }
        }
      }
    });

    // Save last section
    if (currentSection !== null) {
      type SectionType = typeof sections[0];
      const lastSection = currentSection as SectionType;
      // Save any remaining text
      if (textStartIndex !== -1 && lastSection.textStartIndex === -1) {
        lastSection.textStartIndex = textStartIndex;
        lastSection.textEndIndex = lines.length - 1;
        lastSection.textContent = lines.slice(textStartIndex).join('\n').trim();
      }
      
      // Mark as list section if title suggests it's a list section (even if empty)
      const listSectionKeywords = ['aufgaben', 'todos', 'to-dos', 'kernpunkte', 'notizen', 'anmerkungen', 'action items', 'key points', 'notes'];
      const titleLower = lastSection.title.toLowerCase();
      if (listSectionKeywords.some(keyword => titleLower.includes(keyword))) {
        lastSection.isListSection = true;
      }
      
      sections.push(lastSection);
    }

    return sections;
  };

  const handleView = useCallback(async (recording: Recording) => {
    setSelectedRecording(recording);
    setTranscription(null);
    setIsTranscriptionExpanded(false);
    await loadTranscription(recording.id);
  }, []);

  // Auto-select recording from query parameter
  useEffect(() => {
    const recordingId = searchParams.get('recording');
    if (recordingId && recordings.length > 0) {
      const recording = recordings.find((r) => r.id === recordingId);
      if (recording && recording.id !== selectedRecording?.id) {
        handleView(recording);
      }
    }
  }, [searchParams, recordings, selectedRecording, handleView]);

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

  const handleSendEmail = async (recording: Recording) => {
    setSelectedRecording(recording);
    setEmailToSend('');
    setEmailSuccess(null);
    
    // Load transcription if not already loaded
    if (!transcription || transcription.recording_id !== recording.id) {
      await loadTranscription(recording.id);
    }
    
    setEmailModalOpen(true);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecording || !emailToSend.trim()) return;

    setSendingEmail(true);
    setEmailSuccess(null);
    setError(null);

    try {
      await api.sendRecordingEmail(selectedRecording.id, emailToSend.trim());
      setEmailSuccess('E-Mail wurde erfolgreich versendet!');
      setTimeout(() => {
        setEmailModalOpen(false);
        setEmailToSend('');
        setEmailSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Versenden der E-Mail');
    } finally {
      setSendingEmail(false);
    }
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
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-10rem)] flex flex-col">
            <div className="overflow-y-auto flex-1 space-y-4 pr-2">
            {recordings.length === 0 ? (
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
                          handleSendEmail(recording);
                        }}
                        className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-400 hover:text-gold-500 hover:border-gold-500/30 transition-all duration-200"
                        aria-label="Per E-Mail teilen"
                      >
                        <Mail className="w-4 h-4" />
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
          </div>

          {/* Detail-Ansicht */}
          <div className="lg:sticky lg:top-24 lg:h-[calc(100vh-10rem)]">
            {selectedRecording ? (
              <div 
                key={selectedRecording.id}
                className="bg-dark-850 border border-dark-700 rounded-2xl overflow-hidden h-full flex flex-col transition-smooth animate-fade-in"
              >
                <div className="px-6 py-5 border-b border-dark-700">
                  <h2 className="text-lg font-semibold text-white">Aufnahme-Details</h2>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1">
                  <div className="space-y-5 mb-6 transition-smooth">
                    <div className="transition-smooth">
                      <label className="text-xs font-medium text-dark-500 uppercase tracking-wider">
                        Dateiname
                      </label>
                      <p className="text-white mt-1 transition-all duration-300">{selectedRecording.original_filename}</p>
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
                  <div className="mb-6 transition-smooth">
                    <label className="text-xs font-medium text-dark-500 uppercase tracking-wider mb-3 block">
                      Audio
                    </label>
                    <AudioPlayer 
                      audioUrl={api.getRecordingAudioUrl(selectedRecording.id)}
                      fallbackDuration={selectedRecording.duration_ms ? selectedRecording.duration_ms / 1000 : undefined}
                    />
                  </div>

                  {transcription ? (
                    <div className="border-t border-dark-700 pt-6 transition-smooth">
                      <button
                        onClick={() => setIsTranscriptionExpanded(!isTranscriptionExpanded)}
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

                      {localEnrichments && localEnrichments.length > 0 && (
                        <div className="transition-smooth">
                          <h4 className="text-sm font-semibold text-white mb-3 transition-all duration-300">
                            Enrichments ({localEnrichments.length})
                          </h4>
                          <div className="space-y-3">
                            {localEnrichments.map((enrichment, index) => (
                              <div
                                key={enrichment.id}
                                className="bg-gold-500/5 border border-gold-500/10 rounded-xl p-4 transition-smooth animate-fade-in"
                                style={{ animationDelay: `${index * 50}ms` }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-gold-500 uppercase tracking-wider">
                                    {enrichment.type}
                                  </span>
                                  {editingEnrichmentId === enrichment.id ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={handleSaveEdit}
                                        disabled={savingEnrichment || !editedEnrichmentContent.trim()}
                                        className="p-1.5 rounded-lg bg-gold-500/20 border border-gold-500/30 text-gold-400 hover:bg-gold-500/30 hover:border-gold-500/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Speichern"
                                      >
                                        {savingEnrichment ? (
                                          <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <Save className="w-4 h-4" />
                                        )}
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        disabled={savingEnrichment}
                                        className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        aria-label="Abbrechen"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleStartEdit(enrichment.id, enrichment.content)}
                                      className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-gold-500 hover:border-gold-500/30 transition-all duration-200"
                                      aria-label="Bearbeiten"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                
                                {editingEnrichmentId === enrichment.id ? (
                                  <div className="space-y-3">
                                    <textarea
                                      value={editedEnrichmentContent}
                                      onChange={(e) => setEditedEnrichmentContent(e.target.value)}
                                      className="w-full bg-dark-900 border border-dark-600 rounded-lg p-3 text-dark-200 text-sm leading-relaxed resize-none focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/50 font-mono"
                                      rows={12}
                                      placeholder="Enrichment-Content bearbeiten..."
                                    />
                                    <p className="text-xs text-dark-500">
                                      Markdown wird unterstützt. Nach dem Speichern wird der Inhalt formatiert angezeigt.
                                    </p>
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {(() => {
                                      const sections = parseEnrichmentSections(enrichment.content);
                                      // If no sections found (for simple enrichments like summary, formatted, etc.), show raw content
                                      if (sections.length === 0 || (sections.length === 1 && !sections[0].title)) {
                                        return (
                                          <div className="prose prose-invert prose-sm max-w-none text-dark-300 text-sm leading-relaxed">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                              {enrichment.content}
                                            </ReactMarkdown>
                                          </div>
                                        );
                                      }
                                      // Otherwise show sections (for complete enrichments)
                                      return sections.map((section, sectionIdx) => (
                                        <div key={sectionIdx} className="space-y-2">
                                          {/* Section Header */}
                                          <h3 className="text-sm font-semibold text-white border-b border-dark-700 pb-1">
                                            {section.title}
                                          </h3>
                                        
                                          {/* Text Content (for sections like Zusammenfassung) */}
                                          {section.textContent && !section.isListSection && (
                                            <div className="group relative">
                                              {editingItemInfo?.enrichmentId === enrichment.id && editingItemInfo?.lineIndex === section.textStartIndex ? (
                                                <div className="space-y-2">
                                                  <textarea
                                                    value={editingItemInfo.text}
                                                    onChange={(e) => setEditingItemInfo({ ...editingItemInfo, text: e.target.value })}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Escape') {
                                                        setEditingItemInfo(null);
                                                      }
                                                    }}
                                                    className="w-full bg-dark-900 border border-gold-500/50 rounded px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-gold-500 resize-none"
                                                    rows={4}
                                                    autoFocus
                                                  />
                                                  <div className="flex items-center gap-2">
                                                    <button
                                                      onClick={() => updateTextContent(enrichment.id, enrichment.content, section.textStartIndex, section.textEndIndex, editingItemInfo.text)}
                                                      className="px-3 py-1 rounded bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 text-sm flex items-center gap-1"
                                                    >
                                                      <Check className="w-3 h-3" />
                                                      Speichern
                                                    </button>
                                                    <button
                                                      onClick={() => setEditingItemInfo(null)}
                                                      className="px-3 py-1 rounded bg-dark-700 text-dark-400 hover:text-white text-sm flex items-center gap-1"
                                                    >
                                                      <X className="w-3 h-3" />
                                                      Abbrechen
                                                    </button>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="group relative">
                                                  <p 
                                                    className="text-sm text-dark-300 leading-relaxed cursor-pointer hover:bg-dark-800/30 rounded px-2 py-1 -mx-2 transition-colors"
                                                    onClick={() => setEditingItemInfo({ enrichmentId: enrichment.id, lineIndex: section.textStartIndex, text: section.textContent })}
                                                  >
                                                    {section.textContent}
                                                  </p>
                                                  <button
                                                    onClick={() => setEditingItemInfo({ enrichmentId: enrichment.id, lineIndex: section.textStartIndex, text: section.textContent })}
                                                    className="absolute top-1 right-1 p-1 rounded bg-dark-800/80 border border-dark-700 text-dark-400 hover:text-gold-400 hover:border-gold-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    title="Bearbeiten"
                                                  >
                                                    <Edit2 className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                          
                                          {/* List Items */}
                                          {section.isListSection && (
                                            <>
                                              {section.items.length > 0 && (
                                                <ul className="space-y-1">
                                                  {section.items.map((item, itemIdx) => (
                                                    <li 
                                                      key={itemIdx}
                                                      className="group flex items-start gap-2 py-1 px-2 -mx-2 rounded-lg hover:bg-dark-800/50 transition-colors"
                                                    >
                                                      {/* Checkbox or bullet */}
                                                      {item.isCheckbox ? (
                                                        <button
                                                          onClick={() => {
                                                            // Calculate the checkbox index (count of checkboxes before this line)
                                                            const lines = enrichment.content.split('\n');
                                                            let checkboxIdx = 0;
                                                            for (let i = 0; i < item.lineIndex; i++) {
                                                              if (/^- \[[ x]\]/.test(lines[i])) {
                                                                checkboxIdx++;
                                                              }
                                                            }
                                                            toggleCheckbox(enrichment.id, enrichment.content, checkboxIdx);
                                                          }}
                                                          className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 cursor-pointer"
                                                          style={{
                                                            backgroundColor: item.isChecked ? '#d4a853' : 'transparent',
                                                            borderColor: item.isChecked ? '#d4a853' : '#4a4a4a',
                                                          }}
                                                        >
                                                          {item.isChecked && (
                                                            <Check className="w-3 h-3 text-dark-900" />
                                                          )}
                                                        </button>
                                                      ) : item.isNumbered ? (
                                                        <span className="text-gold-500 font-medium text-sm mt-0.5 flex-shrink-0 w-5">
                                                          {itemIdx + 1}.
                                                        </span>
                                                      ) : (
                                                        <span className="text-gold-500 mt-1 flex-shrink-0">•</span>
                                                      )}
                                                      
                                                      {/* Item content - editable */}
                                                      {editingItemInfo?.enrichmentId === enrichment.id && editingItemInfo?.lineIndex === item.lineIndex ? (
                                                        <div className="flex-1 flex items-center gap-2">
                                                          <input
                                                            type="text"
                                                            value={editingItemInfo.text}
                                                            onChange={(e) => setEditingItemInfo({ ...editingItemInfo, text: e.target.value })}
                                                            onKeyDown={(e) => {
                                                              if (e.key === 'Enter') {
                                                                updateListItem(enrichment.id, enrichment.content, item.lineIndex, editingItemInfo.text);
                                                              } else if (e.key === 'Escape') {
                                                                setEditingItemInfo(null);
                                                              }
                                                            }}
                                                            className="flex-1 bg-dark-900 border border-gold-500/50 rounded px-2 py-1 text-sm text-dark-200 focus:outline-none focus:border-gold-500"
                                                            autoFocus
                                                          />
                                                          <button
                                                            onClick={() => updateListItem(enrichment.id, enrichment.content, item.lineIndex, editingItemInfo.text)}
                                                            className="p-1 rounded bg-gold-500/20 text-gold-400 hover:bg-gold-500/30"
                                                          >
                                                            <Check className="w-3 h-3" />
                                                          </button>
                                                          <button
                                                            onClick={() => setEditingItemInfo(null)}
                                                            className="p-1 rounded bg-dark-700 text-dark-400 hover:text-white"
                                                          >
                                                            <X className="w-3 h-3" />
                                                          </button>
                                                        </div>
                                                      ) : (
                                                        <>
                                                          <span 
                                                            className={`flex-1 text-sm text-dark-300 cursor-pointer ${item.isChecked ? 'line-through text-dark-500' : ''}`}
                                                            onClick={() => setEditingItemInfo({ enrichmentId: enrichment.id, lineIndex: item.lineIndex, text: item.text })}
                                                          >
                                                            {item.text}
                                                          </span>
                                                          
                                                          {/* Action buttons - visible on hover */}
                                                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                              onClick={() => setEditingItemInfo({ enrichmentId: enrichment.id, lineIndex: item.lineIndex, text: item.text })}
                                                              className="p-1 rounded bg-dark-700 text-dark-400 hover:text-gold-400 hover:bg-dark-600 transition-colors"
                                                              title="Bearbeiten"
                                                            >
                                                              <Edit2 className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                              onClick={() => deleteListItem(enrichment.id, enrichment.content, item.lineIndex)}
                                                              className="p-1 rounded bg-dark-700 text-dark-400 hover:text-red-400 hover:bg-dark-600 transition-colors"
                                                              title="Löschen"
                                                            >
                                                              <Trash2 className="w-3 h-3" />
                                                            </button>
                                                          </div>
                                                        </>
                                                      )}
                                                    </li>
                                                  ))}
                                                </ul>
                                              )}
                                              
                                              {/* Add new item - always show for list sections */}
                                              {addingItemTo?.enrichmentId === enrichment.id && addingItemTo?.section === section.title ? (
                                                <div className="flex items-center gap-2 pl-6 mt-2">
                                                  <input
                                                    type="text"
                                                    value={newItemText}
                                                    onChange={(e) => setNewItemText(e.target.value)}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                        addListItem(enrichment.id, enrichment.content, section.title);
                                                      } else if (e.key === 'Escape') {
                                                        setAddingItemTo(null);
                                                        setNewItemText('');
                                                      }
                                                    }}
                                                    placeholder="Neuen Punkt eingeben..."
                                                    className="flex-1 bg-dark-900 border border-gold-500/50 rounded px-2 py-1 text-sm text-dark-200 focus:outline-none focus:border-gold-500"
                                                    autoFocus
                                                  />
                                                  <button
                                                    onClick={() => addListItem(enrichment.id, enrichment.content, section.title)}
                                                    className="p-1 rounded bg-gold-500/20 text-gold-400 hover:bg-gold-500/30"
                                                  >
                                                    <Check className="w-3 h-3" />
                                                  </button>
                                                  <button
                                                    onClick={() => { setAddingItemTo(null); setNewItemText(''); }}
                                                    className="p-1 rounded bg-dark-700 text-dark-400 hover:text-white"
                                                  >
                                                    <X className="w-3 h-3" />
                                                  </button>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => setAddingItemTo({ enrichmentId: enrichment.id, section: section.title })}
                                                  className={`flex items-center gap-1 text-xs text-dark-500 hover:text-gold-400 transition-colors ${section.items.length > 0 ? 'pl-6 mt-1' : 'mt-2'}`}
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  Hinzufügen
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                )}
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

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-dark-850 border border-dark-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Aufnahme per E-Mail teilen</h2>
              <button
                onClick={() => {
                  setEmailModalOpen(false);
                  setEmailToSend('');
                  setEmailSuccess(null);
                }}
                className="p-2 rounded-xl bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 transition-all duration-200"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-gold-500" />
                </div>
                <p className="text-gold-500 font-medium">{emailSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-dark-400 mb-2">
                    E-Mail-Adresse
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={emailToSend}
                    onChange={(e) => setEmailToSend(e.target.value)}
                    placeholder="empfaenger@example.com"
                    required
                    className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 transition-all duration-200"
                  />
                </div>

                <div className="bg-dark-900/50 border border-dark-700 rounded-xl p-4 text-sm text-dark-300">
                  <p className="mb-2 font-medium text-dark-400">Die E-Mail enthält:</p>
                  <ul className="list-disc list-inside space-y-1 text-dark-400">
                    <li>Audio-Datei als Anhang</li>
                    {selectedRecording?.transcription_text && (
                      <li>Transkription</li>
                    )}
                    {transcription?.enrichments && transcription.enrichments.length > 0 && (
                      <li>{transcription.enrichments.length} Enrichment(s)</li>
                    )}
                  </ul>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailModalOpen(false);
                      setEmailToSend('');
                      setEmailSuccess(null);
                    }}
                    className="flex-1 px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 transition-all duration-200 font-medium"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmail || !emailToSend.trim()}
                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-dark-950 font-medium shadow-gold hover:shadow-gold-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sendingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                        Wird gesendet...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Senden
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
