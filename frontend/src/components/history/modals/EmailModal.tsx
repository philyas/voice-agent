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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-dark-850 border border-dark-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Aufnahme per E-Mail teilen</h2>
          <button
            onClick={onClose}
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
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-400 mb-2">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                id="email"
                value={emailToSend}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="empfaenger@example.com"
                required
                className="w-full px-4 py-3 bg-dark-900 border border-dark-700 rounded-xl text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 transition-all duration-200"
              />
            </div>

            <div className="bg-dark-900/50 border border-dark-700 rounded-xl p-4 text-sm text-dark-300">
              <p className="mb-2 font-medium text-dark-400">Die E-Mail enthält:</p>
              <ul className="list-disc list-inside space-y-1 text-dark-400">
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
  );
}

export default EmailModal;
