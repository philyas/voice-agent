'use client';

import { useState } from 'react';
import { FileText, Sparkles, Loader2, Copy, Check, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    <div className="bg-dark-850 border border-dark-700 rounded-2xl overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="px-6 py-4 border-b border-dark-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-700 flex items-center justify-center">
            <FileText className="w-5 h-5 text-gold-500" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Transkription</h3>
          </div>
        </div>
        <button
          onClick={() => handleCopy(activeContent || text)}
          className="p-2.5 rounded-lg bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 transition-all duration-200"
          aria-label="Kopieren"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Content */}
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
            <div className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-dark-200 prose-strong:text-white prose-em:text-dark-300 prose-code:text-gold-400 prose-code:bg-dark-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-dark-900 prose-pre:border prose-pre:border-dark-700 prose-ul:text-dark-200 prose-ol:text-dark-200 prose-li:text-dark-200 prose-a:text-gold-400 prose-a:hover:text-gold-300 prose-blockquote:text-dark-300 prose-blockquote:border-dark-600">
              {activeContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeContent}
                </ReactMarkdown>
              ) : (
                <p className="text-dark-200 whitespace-pre-wrap leading-relaxed text-[15px]">
                  {text}
                </p>
              )}
            </div>

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

      {/* Enrichment Options */}
      {!isLoading && text && onEnrich && (
        <div className="px-6 py-5 bg-dark-900/50 border-t border-dark-700">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-gold-500" />
            <span className="text-sm font-semibold text-white">KI-Anreicherung</span>
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
                    px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
                    ${isActive
                      ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-dark-950 shadow-gold'
                      : hasEnrichment
                        ? 'bg-dark-800 border border-gold-500/30 text-gold-400 hover:border-gold-500/50'
                        : 'bg-dark-800 border border-dark-700 text-dark-300 hover:text-white hover:border-dark-600'
                    }
                    ${isLoadingThis ? 'opacity-70 cursor-wait' : ''}
                  `}
                >
                  {isLoadingThis ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>{icon}</span>
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
