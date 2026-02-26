'use client';

import { X, Copy, CheckCircle } from 'lucide-react';

interface GoogleDocsLoadingModalProps {
  isOpen: boolean;
  creatingGoogleDoc: boolean;
}

export function GoogleDocsLoadingModal({ isOpen, creatingGoogleDoc }: GoogleDocsLoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-dark-300 rounded-2xl p-8 max-w-sm w-full shadow-xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full border-4 border-dark-200 border-t-ptw-500 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-dark-900 mb-2">
            {creatingGoogleDoc ? 'Erstelle Dokument...' : 'Wird vorbereitet...'}
          </h2>
          <p className="text-dark-600 text-sm">Bitte warten Sie einen Moment.</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-dark-300 rounded-2xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-dark-900">Zu Google Docs exportieren</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-dark-100 border border-dark-300 text-dark-600 hover:text-ptw-600 hover:border-ptw-400/60 hover:bg-dark-50 transition-all duration-200"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-dark-50 border border-dark-300 rounded-xl p-4 mb-4 text-sm text-dark-700 flex-1 overflow-y-auto">
          <div
            className="prose prose-sm max-w-none prose-headings:text-dark-900 prose-p:text-dark-700 prose-li:text-dark-700"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        <div className="bg-dark-50 border border-dark-300 rounded-xl p-4 mb-4 text-sm text-dark-600">
          <p className="mb-2 font-medium text-dark-700">Anleitung:</p>
          <ol className="list-decimal list-inside space-y-1 text-dark-600">
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
            className="flex-1 px-4 py-3 rounded-xl bg-white border border-dark-300 text-dark-700 hover:border-ptw-400/60 hover:bg-dark-50 transition-all duration-200 font-medium shadow-sm"
          >
            Schließen
          </button>
          <button
            type="button"
            onClick={onCopyToClipboard}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-ptw-500 to-ptw-600 text-white font-medium shadow-ptw hover:shadow-ptw-lg transition-all duration-200 flex items-center justify-center gap-2"
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
