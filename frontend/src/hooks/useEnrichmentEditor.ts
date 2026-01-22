/**
 * useEnrichmentEditor Hook
 * Manages enrichment editing state and operations
 */

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Enrichment } from '@/lib/types';
import { LIST_SECTION_KEYWORDS } from '@/lib/constants';
import type { ParsedEnrichmentSection } from '@/lib/types';

interface UseEnrichmentEditorReturn {
  localEnrichments: Enrichment[];
  editingEnrichmentId: string | null;
  editedEnrichmentContent: string;
  savingEnrichment: boolean;
  addingItemTo: { enrichmentId: string; section: string } | null;
  newItemText: string;
  editingItemInfo: { enrichmentId: string; lineIndex: number; text: string } | null;
  setLocalEnrichments: React.Dispatch<React.SetStateAction<Enrichment[]>>;
  setAddingItemTo: React.Dispatch<React.SetStateAction<{ enrichmentId: string; section: string } | null>>;
  setNewItemText: React.Dispatch<React.SetStateAction<string>>;
  setEditingItemInfo: React.Dispatch<React.SetStateAction<{ enrichmentId: string; lineIndex: number; text: string } | null>>;
  setEditedEnrichmentContent: React.Dispatch<React.SetStateAction<string>>;
  startEdit: (enrichmentId: string, currentContent: string) => void;
  cancelEdit: () => void;
  saveEdit: () => Promise<void>;
  toggleCheckbox: (enrichmentId: string, content: string, checkboxIndex: number) => Promise<void>;
  deleteListItem: (enrichmentId: string, content: string, lineIndex: number) => Promise<void>;
  addListItem: (enrichmentId: string, content: string, section: string) => Promise<void>;
  updateListItem: (enrichmentId: string, content: string, lineIndex: number, newText: string) => Promise<void>;
  updateTextContent: (enrichmentId: string, content: string, startIndex: number, endIndex: number, newText: string) => Promise<void>;
  parseEnrichmentSections: (content: string) => ParsedEnrichmentSection[];
}

export function useEnrichmentEditor(
  initialEnrichments: Enrichment[] = [],
  setError?: (error: string | null) => void
): UseEnrichmentEditorReturn {
  const [localEnrichments, setLocalEnrichments] = useState<Enrichment[]>(initialEnrichments);
  const [editingEnrichmentId, setEditingEnrichmentId] = useState<string | null>(null);
  const [editedEnrichmentContent, setEditedEnrichmentContent] = useState<string>('');
  const [savingEnrichment, setSavingEnrichment] = useState(false);
  const [addingItemTo, setAddingItemTo] = useState<{ enrichmentId: string; section: string } | null>(null);
  const [newItemText, setNewItemText] = useState('');
  const [editingItemInfo, setEditingItemInfo] = useState<{ enrichmentId: string; lineIndex: number; text: string } | null>(null);

  /**
   * Start editing an enrichment
   */
  const startEdit = useCallback((enrichmentId: string, currentContent: string) => {
    setEditingEnrichmentId(enrichmentId);
    setEditedEnrichmentContent(currentContent);
  }, []);

  /**
   * Cancel editing
   */
  const cancelEdit = useCallback(() => {
    setEditingEnrichmentId(null);
    setEditedEnrichmentContent('');
  }, []);

  /**
   * Save edited enrichment
   */
  const saveEdit = useCallback(async () => {
    if (!editingEnrichmentId || !editedEnrichmentContent.trim()) return;

    setSavingEnrichment(true);
    try {
      const response = await api.updateEnrichment(editingEnrichmentId, editedEnrichmentContent);
      if (response.data) {
        setLocalEnrichments(prev =>
          prev.map(e => e.id === editingEnrichmentId ? { ...e, content: editedEnrichmentContent } : e)
        );
        setEditingEnrichmentId(null);
        setEditedEnrichmentContent('');
      }
    } catch (error) {
      console.error('Failed to save enrichment:', error);
      setError?.('Fehler beim Speichern des Enrichments');
    } finally {
      setSavingEnrichment(false);
    }
  }, [editingEnrichmentId, editedEnrichmentContent, setError]);

  /**
   * Toggle a checkbox in markdown content
   */
  const toggleCheckbox = useCallback(async (enrichmentId: string, content: string, checkboxIndex: number) => {
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
      prev.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
    );

    // Save to backend
    try {
      await api.updateEnrichment(enrichmentId, newContent);
    } catch (error) {
      // Revert on error
      setLocalEnrichments(prev =>
        prev.map(e => e.id === enrichmentId ? { ...e, content } : e)
      );
      console.error('Failed to save checkbox state:', error);
    }
  }, []);

  /**
   * Delete a list item from enrichment content
   */
  const deleteListItem = useCallback(async (enrichmentId: string, content: string, lineIndex: number) => {
    const lines = content.split('\n');
    const newLines = lines.filter((_, idx) => idx !== lineIndex);
    const newContent = newLines.join('\n');

    // Update local state immediately
    setLocalEnrichments(prev =>
      prev.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
    );

    // Save to backend
    try {
      await api.updateEnrichment(enrichmentId, newContent);
    } catch (error) {
      // Revert on error
      setLocalEnrichments(prev =>
        prev.map(e => e.id === enrichmentId ? { ...e, content } : e)
      );
      console.error('Failed to delete item:', error);
    }
  }, []);

  /**
   * Add a new list item to a section
   */
  const addListItem = useCallback(async (enrichmentId: string, content: string, section: string) => {
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
    }

    // Find the section and determine where to insert
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if we're entering the target section
      if (line.startsWith('## ') && line.toLowerCase().includes(sectionLower)) {
        isInSection = true;
        insertIndex = i + 1;
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
      prev.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
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
        prev.map(e => e.id === enrichmentId ? { ...e, content } : e)
      );
      console.error('Failed to add item:', error);
    }
  }, [newItemText]);

  /**
   * Update an existing list item
   */
  const updateListItem = useCallback(async (enrichmentId: string, content: string, lineIndex: number, newText: string) => {
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
      prev.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
    );

    // Reset editing state
    setEditingItemInfo(null);

    // Save to backend
    try {
      await api.updateEnrichment(enrichmentId, newContent);
    } catch (error) {
      // Revert on error
      setLocalEnrichments(prev =>
        prev.map(e => e.id === enrichmentId ? { ...e, content } : e)
      );
      console.error('Failed to update item:', error);
    }
  }, []);

  /**
   * Update text content (for non-list sections like summary)
   */
  const updateTextContent = useCallback(async (
    enrichmentId: string,
    content: string,
    startIndex: number,
    endIndex: number,
    newText: string
  ) => {
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
      prev.map(e => e.id === enrichmentId ? { ...e, content: newContent } : e)
    );

    // Reset editing state
    setEditingItemInfo(null);

    // Save to backend
    try {
      await api.updateEnrichment(enrichmentId, newContent);
    } catch (error) {
      // Revert on error
      setLocalEnrichments(prev =>
        prev.map(e => e.id === enrichmentId ? { ...e, content } : e)
      );
      console.error('Failed to update text content:', error);
    }
  }, []);

  /**
   * Parse enrichment content into sections for rendering
   */
  const parseEnrichmentSections = useCallback((content: string): ParsedEnrichmentSection[] => {
    const lines = content.split('\n');
    const sections: ParsedEnrichmentSection[] = [];
    let currentSection: ParsedEnrichmentSection | null = null;
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
          const titleLower = currentSection.title.toLowerCase();
          if (LIST_SECTION_KEYWORDS.some(keyword => titleLower.includes(keyword))) {
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
          isListSection: false,
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
            isNumbered,
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
      const lastSection = currentSection;
      // Save any remaining text
      if (textStartIndex !== -1 && lastSection.textStartIndex === -1) {
        lastSection.textStartIndex = textStartIndex;
        lastSection.textEndIndex = lines.length - 1;
        lastSection.textContent = lines.slice(textStartIndex).join('\n').trim();
      }

      // Mark as list section if title suggests it's a list section (even if empty)
      const titleLower = lastSection.title.toLowerCase();
      if (LIST_SECTION_KEYWORDS.some(keyword => titleLower.includes(keyword))) {
        lastSection.isListSection = true;
      }

      sections.push(lastSection);
    }

    return sections;
  }, []);

  return {
    localEnrichments,
    editingEnrichmentId,
    editedEnrichmentContent,
    savingEnrichment,
    addingItemTo,
    newItemText,
    editingItemInfo,
    setLocalEnrichments,
    setAddingItemTo,
    setNewItemText,
    setEditingItemInfo,
    setEditedEnrichmentContent,
    startEdit,
    cancelEdit,
    saveEdit,
    toggleCheckbox,
    deleteListItem,
    addListItem,
    updateListItem,
    updateTextContent,
    parseEnrichmentSections,
  };
}

export default useEnrichmentEditor;
