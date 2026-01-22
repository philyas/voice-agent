'use client';

import { X, Copy, CheckCircle } from 'lucide-react';

interface GoogleDocsLoadingModalProps {
  isOpen: boolean;
  creatingGoogleDoc: boolean;
}

export function GoogleDocsLoadingModal({ isOpen, creatingGoogleDoc }: GoogleDocsLoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-850 border border-dark-700 rounded-2xl p-8 max-w-sm w-full shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full border-4 border-dark-700 border-t-gold-500 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {creatingGoogleDoc ? 'Erstelle Dokument...' : 'Wird vorbereitet...'}
          </h2>
          <p className="text-dark-400 text-sm">Bitte warten Sie einen Moment.</p>
        </div>
      </div>
    </div>
  );
}

interface GoogleDocsContentModalProps {
  isOpen: boolean;
  content: string;
  copiedToClipboard: boolean;
  onClose: () => void;
  onCopyToClipboard: () => void;
}

export function GoogleDocsContentModal({
  isOpen,
  content,
  copiedToClipboard,
  onClose,
  onCopyToClipboard,
}: GoogleDocsContentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-850 border border-dark-700 rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Zu Google Docs exportieren</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 transition-all duration-200"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-dark-900/50 border border-dark-700 rounded-xl p-4 mb-4 text-sm text-dark-300 flex-1 overflow-y-auto">
          <div
            className="prose prose-invert prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        <div className="bg-dark-900/50 border border-dark-700 rounded-xl p-4 mb-4 text-sm text-dark-300">
          <p className="mb-2 font-medium text-dark-400">Anleitung:</p>
          <ol className="list-decimal list-inside space-y-1 text-dark-400">
            <li>Klicke auf "In Zwischenablage kopieren"</li>
            <li>Öffne Google Docs in einem neuen Tab</li>
            <li>Füge den Inhalt ein (Strg+V oder Cmd+V)</li>
            <li>Der Inhalt wird formatiert übernommen</li>
          </ol>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 text-dark-400 hover:text-white hover:border-dark-600 transition-all duration-200 font-medium"
          >
            Schließen
          </button>
          <button
            type="button"
            onClick={onCopyToClipboard}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-gold-500 to-gold-600 text-dark-950 font-medium shadow-gold hover:shadow-gold-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            {copiedToClipboard ? (
              <>
                <CheckCircle className="w-4 h-4" />
                Kopiert!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                In Zwischenablage kopieren
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export { GoogleDocsLoadingModal as default };
