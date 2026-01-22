'use client';

import { Calendar, Clock, FileText, Eye, Share2, Trash2, Mail, FileDown } from 'lucide-react';
import type { Recording } from '@/lib/types';
import { formatDate, formatDuration } from '@/lib/utils';

interface RecordingListItemProps {
  recording: Recording;
  isSelected: boolean;
  shareMenuOpen: boolean;
  exportingPDF: boolean;
  exportingGoogleDocs: boolean;
  creatingGoogleDoc: boolean;
  shareMenuRef: React.RefObject<HTMLDivElement>;
  onSelect: (recording: Recording) => void;
  onView: (recording: Recording) => void;
  onDelete: (id: string) => void;
  onShareClick: (recording: Recording, e: React.MouseEvent) => void;
  onSendEmail: (recording: Recording) => void;
  onExportPDF: (recording: Recording) => void;
  onExportGoogleDocs: (recording: Recording) => void;
  refCallback: (el: HTMLDivElement | null) => void;
}

export function RecordingListItem({
  recording,
  isSelected,
  shareMenuOpen,
  exportingPDF,
  exportingGoogleDocs,
  creatingGoogleDoc,
  shareMenuRef,
  onSelect,
  onView,
  onDelete,
  onShareClick,
  onSendEmail,
  onExportPDF,
  onExportGoogleDocs,
  refCallback,
}: RecordingListItemProps) {
  return (
    <div
      ref={refCallback}
      className={`bg-dark-850 border rounded-2xl p-5 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-gold-500/50 shadow-gold'
          : 'border-dark-700 hover:border-dark-600'
      }`}
      onClick={() => onSelect(recording)}
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
              onView(recording);
            }}
            className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-400 hover:text-gold-500 hover:border-gold-500/30 transition-all duration-200"
            aria-label="Anzeigen"
          >
            <Eye className="w-4 h-4" />
          </button>
          <ShareMenuButton
            recording={recording}
            shareMenuOpen={shareMenuOpen}
            shareMenuRef={shareMenuRef}
            exportingPDF={exportingPDF}
            exportingGoogleDocs={exportingGoogleDocs}
            creatingGoogleDoc={creatingGoogleDoc}
            onShareClick={onShareClick}
            onSendEmail={onSendEmail}
            onExportPDF={onExportPDF}
            onExportGoogleDocs={onExportGoogleDocs}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(recording.id);
            }}
            className="p-2.5 rounded-xl bg-dark-800 border border-dark-700 text-dark-400 hover:text-red-500 hover:border-red-500/30 transition-all duration-200"
            aria-label="Löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface ShareMenuButtonProps {
  recording: Recording;
  shareMenuOpen: boolean;
  shareMenuRef: React.RefObject<HTMLDivElement>;
  exportingPDF: boolean;
  exportingGoogleDocs: boolean;
  creatingGoogleDoc: boolean;
  onShareClick: (recording: Recording, e: React.MouseEvent) => void;
  onSendEmail: (recording: Recording) => void;
  onExportPDF: (recording: Recording) => void;
  onExportGoogleDocs: (recording: Recording) => void;
}

function ShareMenuButton({
  recording,
  shareMenuOpen,
  shareMenuRef,
  exportingPDF,
  exportingGoogleDocs,
  creatingGoogleDoc,
  onShareClick,
  onSendEmail,
  onExportPDF,
  onExportGoogleDocs,
}: ShareMenuButtonProps) {
  return (
    <div className="relative">
      <button
        onClick={(e) => onShareClick(recording, e)}
        className={`p-2.5 rounded-xl border transition-all duration-200 ${
          shareMenuOpen
            ? 'bg-gold-500/10 border-gold-500/50 text-gold-500'
            : 'bg-dark-800 border-dark-700 text-dark-400 hover:text-gold-500 hover:border-gold-500/30'
        }`}
        aria-label="Teilen"
      >
        <Share2 className="w-4 h-4" />
      </button>

      {shareMenuOpen && (
        <div
          ref={shareMenuRef}
          className="absolute right-0 top-full mt-2 w-56 bg-dark-850 border border-dark-700 rounded-xl shadow-2xl z-[60] overflow-hidden"
        >
          <button
            type="button"
            onClick={() => onSendEmail(recording)}
            className="w-full px-4 py-3 text-left text-sm text-dark-300 hover:bg-gold-500/20 hover:text-gold-300 border-l-4 border-l-transparent hover:border-l-gold-500 transition-all duration-150 flex items-center gap-3 group cursor-pointer active:bg-gold-500/30"
          >
            <Mail className="w-4 h-4 text-dark-400 group-hover:text-gold-400 transition-colors flex-shrink-0" />
            <span className="flex-1 font-medium group-hover:text-white transition-colors">
              Per E-Mail teilen
            </span>
          </button>
          <div className="border-t border-dark-700" />
          <button
            type="button"
            onClick={() => onExportPDF(recording)}
            disabled={exportingPDF}
            className="w-full px-4 py-3 text-left text-sm text-dark-300 hover:bg-gold-500/20 hover:text-gold-300 border-l-4 border-l-transparent hover:border-l-gold-500 transition-all duration-150 flex items-center gap-3 group cursor-pointer active:bg-gold-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-dark-300 disabled:hover:border-l-transparent"
          >
            {exportingPDF ? (
              <>
                <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="flex-1 font-medium">PDF wird erstellt...</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-dark-400 group-hover:text-gold-400 transition-colors flex-shrink-0" />
                <span className="flex-1 font-medium group-hover:text-white transition-colors">
                  Als PDF exportieren
                </span>
              </>
            )}
          </button>
          <div className="border-t border-dark-700" />
          <button
            type="button"
            onClick={() => onExportGoogleDocs(recording)}
            disabled={exportingGoogleDocs || creatingGoogleDoc}
            className="w-full px-4 py-3 text-left text-sm text-dark-300 hover:bg-gold-500/20 hover:text-gold-300 border-l-4 border-l-transparent hover:border-l-gold-500 transition-all duration-150 flex items-center gap-3 group cursor-pointer active:bg-gold-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-dark-300 disabled:hover:border-l-transparent"
          >
            {exportingGoogleDocs || creatingGoogleDoc ? (
              <>
                <div className="w-4 h-4 border-2 border-gold-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span className="flex-1 font-medium">
                  {creatingGoogleDoc ? 'Erstelle Dokument...' : 'Wird vorbereitet...'}
                </span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-dark-400 group-hover:text-gold-400 transition-colors flex-shrink-0" />
                <span className="flex-1 font-medium group-hover:text-white transition-colors">
                  Zu Google Docs exportieren
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default RecordingListItem;
