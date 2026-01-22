'use client';

import { Edit2, Save, X, Plus, Check, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Enrichment, ParsedEnrichmentSection } from '@/lib/types';

interface EnrichmentSectionProps {
  enrichment: Enrichment;
  isEditing: boolean;
  editedContent: string;
  savingEnrichment: boolean;
  addingItemTo: { enrichmentId: string; section: string } | null;
  newItemText: string;
  editingItemInfo: { enrichmentId: string; lineIndex: number; text: string } | null;
  parseEnrichmentSections: (content: string) => ParsedEnrichmentSection[];
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
  animationDelay?: number;
}

export function EnrichmentSection({
  enrichment,
  isEditing,
  editedContent,
  savingEnrichment,
  addingItemTo,
  newItemText,
  editingItemInfo,
  parseEnrichmentSections,
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
  animationDelay = 0,
}: EnrichmentSectionProps) {
  const sections = parseEnrichmentSections(enrichment.content);

  return (
    <div
      className="bg-gold-500/5 border border-gold-500/10 rounded-xl p-4 transition-smooth animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gold-500 uppercase tracking-wider">
          {enrichment.type}
        </span>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onSaveEdit}
              disabled={savingEnrichment || !editedContent.trim()}
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
              onClick={onCancelEdit}
              disabled={savingEnrichment}
              className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Abbrechen"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => onStartEdit(enrichment.id, enrichment.content)}
            className="p-1.5 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-gold-500 hover:border-gold-500/30 transition-all duration-200"
            aria-label="Bearbeiten"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={editedContent}
            onChange={(e) => onEditedContentChange(e.target.value)}
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
          {sections.length === 0 || (sections.length === 1 && !sections[0].title) ? (
            // Simple enrichment without sections
            <div className="prose prose-invert prose-sm max-w-none text-dark-300 text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{enrichment.content}</ReactMarkdown>
            </div>
          ) : (
            // Structured enrichment with sections
            sections.map((section, sectionIdx) => (
              <SectionContent
                key={sectionIdx}
                section={section}
                enrichment={enrichment}
                addingItemTo={addingItemTo}
                newItemText={newItemText}
                editingItemInfo={editingItemInfo}
                onToggleCheckbox={onToggleCheckbox}
                onDeleteListItem={onDeleteListItem}
                onAddingItemToChange={onAddingItemToChange}
                onNewItemTextChange={onNewItemTextChange}
                onAddListItem={onAddListItem}
                onEditingItemInfoChange={onEditingItemInfoChange}
                onUpdateListItem={onUpdateListItem}
                onUpdateTextContent={onUpdateTextContent}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface SectionContentProps {
  section: ParsedEnrichmentSection;
  enrichment: Enrichment;
  addingItemTo: { enrichmentId: string; section: string } | null;
  newItemText: string;
  editingItemInfo: { enrichmentId: string; lineIndex: number; text: string } | null;
  onToggleCheckbox: (enrichmentId: string, content: string, checkboxIndex: number) => void;
  onDeleteListItem: (enrichmentId: string, content: string, lineIndex: number) => void;
  onAddingItemToChange: (value: { enrichmentId: string; section: string } | null) => void;
  onNewItemTextChange: (text: string) => void;
  onAddListItem: (enrichmentId: string, content: string, section: string) => void;
  onEditingItemInfoChange: (info: { enrichmentId: string; lineIndex: number; text: string } | null) => void;
  onUpdateListItem: (enrichmentId: string, content: string, lineIndex: number, newText: string) => void;
  onUpdateTextContent: (enrichmentId: string, content: string, startIndex: number, endIndex: number, newText: string) => void;
}

function SectionContent({
  section,
  enrichment,
  addingItemTo,
  newItemText,
  editingItemInfo,
  onToggleCheckbox,
  onDeleteListItem,
  onAddingItemToChange,
  onNewItemTextChange,
  onAddListItem,
  onEditingItemInfoChange,
  onUpdateListItem,
  onUpdateTextContent,
}: SectionContentProps) {
  return (
    <div className="space-y-2">
      {/* Section Header */}
      <h3 className="text-sm font-semibold text-white border-b border-dark-700 pb-1">
        {section.title}
      </h3>

      {/* Text Content (for sections like Zusammenfassung) */}
      {section.textContent && !section.isListSection && (
        <TextContentEditor
          section={section}
          enrichment={enrichment}
          editingItemInfo={editingItemInfo}
          onEditingItemInfoChange={onEditingItemInfoChange}
          onUpdateTextContent={onUpdateTextContent}
        />
      )}

      {/* List Items */}
      {section.isListSection && (
        <ListContent
          section={section}
          enrichment={enrichment}
          addingItemTo={addingItemTo}
          newItemText={newItemText}
          editingItemInfo={editingItemInfo}
          onToggleCheckbox={onToggleCheckbox}
          onDeleteListItem={onDeleteListItem}
          onAddingItemToChange={onAddingItemToChange}
          onNewItemTextChange={onNewItemTextChange}
          onAddListItem={onAddListItem}
          onEditingItemInfoChange={onEditingItemInfoChange}
          onUpdateListItem={onUpdateListItem}
        />
      )}
    </div>
  );
}

interface TextContentEditorProps {
  section: ParsedEnrichmentSection;
  enrichment: Enrichment;
  editingItemInfo: { enrichmentId: string; lineIndex: number; text: string } | null;
  onEditingItemInfoChange: (info: { enrichmentId: string; lineIndex: number; text: string } | null) => void;
  onUpdateTextContent: (enrichmentId: string, content: string, startIndex: number, endIndex: number, newText: string) => void;
}

function TextContentEditor({
  section,
  enrichment,
  editingItemInfo,
  onEditingItemInfoChange,
  onUpdateTextContent,
}: TextContentEditorProps) {
  const isEditing =
    editingItemInfo?.enrichmentId === enrichment.id &&
    editingItemInfo?.lineIndex === section.textStartIndex;

  if (isEditing) {
    return (
      <div className="space-y-2">
        <textarea
          value={editingItemInfo.text}
          onChange={(e) =>
            onEditingItemInfoChange({ ...editingItemInfo, text: e.target.value })
          }
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onEditingItemInfoChange(null);
            }
          }}
          className="w-full bg-dark-900 border border-gold-500/50 rounded px-3 py-2 text-sm text-dark-200 focus:outline-none focus:border-gold-500 resize-none"
          rows={4}
          autoFocus
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onUpdateTextContent(
                enrichment.id,
                enrichment.content,
                section.textStartIndex,
                section.textEndIndex,
                editingItemInfo.text
              )
            }
            className="px-3 py-1 rounded bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 text-sm flex items-center gap-1"
          >
            <Check className="w-3 h-3" />
            Speichern
          </button>
          <button
            onClick={() => onEditingItemInfoChange(null)}
            className="px-3 py-1 rounded bg-dark-700 text-dark-400 hover:text-white text-sm flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <p
        className="text-sm text-dark-300 leading-relaxed cursor-pointer hover:bg-dark-800/30 rounded px-2 py-1 -mx-2 transition-colors"
        onClick={() =>
          onEditingItemInfoChange({
            enrichmentId: enrichment.id,
            lineIndex: section.textStartIndex,
            text: section.textContent,
          })
        }
      >
        {section.textContent}
      </p>
      <button
        onClick={() =>
          onEditingItemInfoChange({
            enrichmentId: enrichment.id,
            lineIndex: section.textStartIndex,
            text: section.textContent,
          })
        }
        className="absolute top-1 right-1 p-1 rounded bg-dark-800/80 border border-dark-700 text-dark-400 hover:text-gold-400 hover:border-gold-500/30 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Bearbeiten"
      >
        <Edit2 className="w-3 h-3" />
      </button>
    </div>
  );
}

interface ListContentProps {
  section: ParsedEnrichmentSection;
  enrichment: Enrichment;
  addingItemTo: { enrichmentId: string; section: string } | null;
  newItemText: string;
  editingItemInfo: { enrichmentId: string; lineIndex: number; text: string } | null;
  onToggleCheckbox: (enrichmentId: string, content: string, checkboxIndex: number) => void;
  onDeleteListItem: (enrichmentId: string, content: string, lineIndex: number) => void;
  onAddingItemToChange: (value: { enrichmentId: string; section: string } | null) => void;
  onNewItemTextChange: (text: string) => void;
  onAddListItem: (enrichmentId: string, content: string, section: string) => void;
  onEditingItemInfoChange: (info: { enrichmentId: string; lineIndex: number; text: string } | null) => void;
  onUpdateListItem: (enrichmentId: string, content: string, lineIndex: number, newText: string) => void;
}

function ListContent({
  section,
  enrichment,
  addingItemTo,
  newItemText,
  editingItemInfo,
  onToggleCheckbox,
  onDeleteListItem,
  onAddingItemToChange,
  onNewItemTextChange,
  onAddListItem,
  onEditingItemInfoChange,
  onUpdateListItem,
}: ListContentProps) {
  const isAddingToThisSection =
    addingItemTo?.enrichmentId === enrichment.id && addingItemTo?.section === section.title;

  return (
    <>
      {section.items.length > 0 && (
        <ul className="space-y-1">
          {section.items.map((item, itemIdx) => (
            <ListItem
              key={itemIdx}
              item={item}
              itemIdx={itemIdx}
              enrichment={enrichment}
              editingItemInfo={editingItemInfo}
              onToggleCheckbox={onToggleCheckbox}
              onDeleteListItem={onDeleteListItem}
              onEditingItemInfoChange={onEditingItemInfoChange}
              onUpdateListItem={onUpdateListItem}
            />
          ))}
        </ul>
      )}

      {/* Add new item */}
      {isAddingToThisSection ? (
        <div className="flex items-center gap-2 pl-6 mt-2">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => onNewItemTextChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onAddListItem(enrichment.id, enrichment.content, section.title);
              } else if (e.key === 'Escape') {
                onAddingItemToChange(null);
                onNewItemTextChange('');
              }
            }}
            placeholder="Neuen Punkt eingeben..."
            className="flex-1 bg-dark-900 border border-gold-500/50 rounded px-2 py-1 text-sm text-dark-200 focus:outline-none focus:border-gold-500"
            autoFocus
          />
          <button
            onClick={() => onAddListItem(enrichment.id, enrichment.content, section.title)}
            className="p-1 rounded bg-gold-500/20 text-gold-400 hover:bg-gold-500/30"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              onAddingItemToChange(null);
              onNewItemTextChange('');
            }}
            className="p-1 rounded bg-dark-700 text-dark-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onAddingItemToChange({ enrichmentId: enrichment.id, section: section.title })}
          className={`flex items-center gap-1 text-xs text-dark-500 hover:text-gold-400 transition-colors ${
            section.items.length > 0 ? 'pl-6 mt-1' : 'mt-2'
          }`}
        >
          <Plus className="w-3 h-3" />
          Hinzufügen
        </button>
      )}
    </>
  );
}

interface ListItemProps {
  item: ParsedEnrichmentSection['items'][0];
  itemIdx: number;
  enrichment: Enrichment;
  editingItemInfo: { enrichmentId: string; lineIndex: number; text: string } | null;
  onToggleCheckbox: (enrichmentId: string, content: string, checkboxIndex: number) => void;
  onDeleteListItem: (enrichmentId: string, content: string, lineIndex: number) => void;
  onEditingItemInfoChange: (info: { enrichmentId: string; lineIndex: number; text: string } | null) => void;
  onUpdateListItem: (enrichmentId: string, content: string, lineIndex: number, newText: string) => void;
}

function ListItem({
  item,
  itemIdx,
  enrichment,
  editingItemInfo,
  onToggleCheckbox,
  onDeleteListItem,
  onEditingItemInfoChange,
  onUpdateListItem,
}: ListItemProps) {
  const isEditing =
    editingItemInfo?.enrichmentId === enrichment.id &&
    editingItemInfo?.lineIndex === item.lineIndex;

  // Calculate checkbox index for toggle
  const getCheckboxIndex = () => {
    const lines = enrichment.content.split('\n');
    let checkboxIdx = 0;
    for (let i = 0; i < item.lineIndex; i++) {
      if (/^- \[[ x]\]/.test(lines[i])) {
        checkboxIdx++;
      }
    }
    return checkboxIdx;
  };

  return (
    <li className="group flex items-start gap-2 py-1 px-2 -mx-2 rounded-lg hover:bg-dark-800/50 transition-colors">
      {/* Checkbox or bullet */}
      {item.isCheckbox ? (
        <button
          onClick={() => onToggleCheckbox(enrichment.id, enrichment.content, getCheckboxIndex())}
          className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 cursor-pointer"
          style={{
            backgroundColor: item.isChecked ? '#d4a853' : 'transparent',
            borderColor: item.isChecked ? '#d4a853' : '#4a4a4a',
          }}
        >
          {item.isChecked && <Check className="w-3 h-3 text-dark-900" />}
        </button>
      ) : item.isNumbered ? (
        <span className="text-gold-500 font-medium text-sm mt-0.5 flex-shrink-0 w-5">
          {itemIdx + 1}.
        </span>
      ) : (
        <span className="text-gold-500 mt-1 flex-shrink-0">•</span>
      )}

      {/* Item content */}
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editingItemInfo.text}
            onChange={(e) => onEditingItemInfoChange({ ...editingItemInfo, text: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdateListItem(enrichment.id, enrichment.content, item.lineIndex, editingItemInfo.text);
              } else if (e.key === 'Escape') {
                onEditingItemInfoChange(null);
              }
            }}
            className="flex-1 bg-dark-900 border border-gold-500/50 rounded px-2 py-1 text-sm text-dark-200 focus:outline-none focus:border-gold-500"
            autoFocus
          />
          <button
            onClick={() =>
              onUpdateListItem(enrichment.id, enrichment.content, item.lineIndex, editingItemInfo.text)
            }
            className="p-1 rounded bg-gold-500/20 text-gold-400 hover:bg-gold-500/30"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => onEditingItemInfoChange(null)}
            className="p-1 rounded bg-dark-700 text-dark-400 hover:text-white"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <>
          <span
            className={`flex-1 text-sm text-dark-300 cursor-pointer ${
              item.isChecked ? 'line-through text-dark-500' : ''
            }`}
            onClick={() =>
              onEditingItemInfoChange({
                enrichmentId: enrichment.id,
                lineIndex: item.lineIndex,
                text: item.text,
              })
            }
          >
            {item.text}
          </span>

          {/* Action buttons - visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() =>
                onEditingItemInfoChange({
                  enrichmentId: enrichment.id,
                  lineIndex: item.lineIndex,
                  text: item.text,
                })
              }
              className="p-1 rounded bg-dark-700 text-dark-400 hover:text-gold-400 hover:bg-dark-600 transition-colors"
              title="Bearbeiten"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => onDeleteListItem(enrichment.id, enrichment.content, item.lineIndex)}
              className="p-1 rounded bg-dark-700 text-dark-400 hover:text-red-400 hover:bg-dark-600 transition-colors"
              title="Löschen"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export default EnrichmentSection;
