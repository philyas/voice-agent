'use client';

import { X, Mail } from 'lucide-react';
import type { Recording, Transcription } from '@/lib/types';

interface EmailModalProps {
  isOpen: boolean;
  selectedRecording: Recording | null;
  transcription: Transcription | null;
  emailToSend: string;
  sendingEmail: boolean;
  emailSuccess: string | null;
  onClose: () => void;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function EmailModal({
  isOpen,
  selectedRecording,
  transcription,
  emailToSend,
  sendingEmail,
  emailSuccess,
  onClose,
  onEmailChange,
  onSubmit,
}: EmailModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border border-dark-300 rounded-2xl p-6 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-dark-900">Aufnahme per E-Mail teilen</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-dark-100 border border-dark-300 text-dark-600 hover:text-ptw-600 hover:border-ptw-400/60 hover:bg-dark-50 transition-all duration-200"
            aria-label="Schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {emailSuccess ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-ptw-500/10 border border-ptw-500/30 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-ptw-500" />
            </div>
            <p className="text-ptw-600 font-medium">{emailSuccess}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-600 mb-2">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                id="email"
                value={emailToSend}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="empfaenger@example.com"
                required
                className="w-full px-4 py-3 bg-white border border-dark-300 rounded-xl text-dark-900 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-ptw-500/50 focus:border-ptw-500/50 transition-all duration-200"
              />
            </div>

            <div className="bg-dark-50 border border-dark-300 rounded-xl p-4 text-sm text-dark-600">
              <p className="mb-2 font-medium text-dark-700">Die E-Mail enthält:</p>
              <ul className="list-disc list-inside space-y-1 text-dark-600">
                <li>Audio-Datei als Anhang</li>
                {selectedRecording?.transcription_text && <li>Transkription</li>}
                {transcription?.enrichments && transcription.enrichments.length > 0 && (
                  <li>{transcription.enrichments.length} Enrichment(s)</li>
                )}
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl bg-white border border-dark-300 text-dark-700 hover:border-ptw-400/60 hover:bg-dark-50 transition-all duration-200 font-medium shadow-sm"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={sendingEmail || !emailToSend.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-ptw-500 to-ptw-600 text-white font-medium shadow-ptw hover:shadow-ptw-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
  );
}

export default EmailModal;
