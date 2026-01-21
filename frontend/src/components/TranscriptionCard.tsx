'use client';

import { useState } from 'react';
import { FileText, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import type { EnrichmentType } from '@/lib/api';

interface TranscriptionCardProps {
  text: string;
  isLoading?: boolean;
  onEnrich?: (type: EnrichmentType) => Promise<void>;
  enrichments?: Array<{
    type: string;
    content: string;
  }>;
}

const ENRICHMENT_OPTIONS: { type: EnrichmentType; label: string; icon: string }[] = [
  { type: 'summary', label: 'Zusammenfassung', icon: '📝' },
  { type: 'formatted', label: 'Formatiert', icon: '✨' },
  { type: 'notes', label: 'Notizen', icon: '📋' },
  { type: 'action_items', label: 'Aufgaben', icon: '✅' },
  { type: 'key_points', label: 'Kernpunkte', icon: '🎯' },
  { type: 'translation', label: 'Englisch', icon: '🌐' },
];

export function TranscriptionCard({
  text,
  isLoading = false,
  onEnrich,
  enrichments = [],
}: TranscriptionCardProps) {
  const [activeEnrichment, setActiveEnrichment] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const activeContent = activeEnrichment
    ? enrichments.find((e) => e.type === activeEnrichment)?.content
    : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          <h3 className="font-medium text-gray-900 dark:text-white">Transkription</h3>
        </div>
        <button
          onClick={() => handleCopy(activeContent || text)}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Kopieren"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            <span className="ml-2 text-gray-600 dark:text-gray-300">Transkribiere...</span>
          </div>
        ) : (
          <>
            {/* Original or Enriched Text */}
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {activeContent || text}
              </p>
            </div>

            {/* Back to original button */}
            {activeEnrichment && (
              <button
                onClick={() => setActiveEnrichment(null)}
                className="mt-3 text-sm text-primary-500 hover:text-primary-600 transition-colors"
              >
                ← Original anzeigen
              </button>
            )}
          </>
        )}
      </div>

      {/* Enrichment Options */}
      {!isLoading && text && onEnrich && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              KI-Anreicherung
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ENRICHMENT_OPTIONS.map(({ type, label, icon }) => {
              const hasEnrichment = enrichments.some((e) => e.type === type);
              const isActive = activeEnrichment === type;
              const isLoadingThis = loadingType === type;

              return (
                <button
                  key={type}
                  onClick={() => hasEnrichment ? setActiveEnrichment(type) : handleEnrich(type)}
                  disabled={isLoadingThis}
                  className={`
                    px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-primary-500 text-white'
                      : hasEnrichment
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800'
                        : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500'
                    }
                    ${isLoadingThis ? 'opacity-50 cursor-wait' : ''}
                  `}
                >
                  {isLoadingThis ? (
                    <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                  ) : (
                    <span className="mr-1">{icon}</span>
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
