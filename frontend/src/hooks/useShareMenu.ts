/**
 * useShareMenu Hook
 * Manages share menu state and export operations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Recording } from '@/lib/types';

interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

interface UseShareMenuReturn {
  shareMenuOpen: string | null;
  shareMenuRef: React.RefObject<HTMLDivElement>;
  emailModalOpen: boolean;
  emailToSend: string;
  sendingEmail: boolean;
  emailSuccess: string | null;
  exportingPDF: boolean;
  exportingGoogleDocs: boolean;
  creatingGoogleDoc: boolean;
  googleDocsModalOpen: boolean;
  googleDocsContent: string;
  copiedToClipboard: boolean;
  setShareMenuOpen: (id: string | null) => void;
  setEmailModalOpen: (open: boolean) => void;
  setEmailToSend: (email: string) => void;
  setEmailSuccess: (success: string | null) => void;
  setGoogleDocsModalOpen: (open: boolean) => void;
  setGoogleDocsContent: (content: string) => void;
  setCopiedToClipboard: (copied: boolean) => void;
  handleShareClick: (recording: Recording, e: React.MouseEvent) => void;
  handleSendEmail: (recording: Recording, loadTranscription: (id: string) => Promise<void>, transcriptionRecordingId?: string) => Promise<void>;
  handleEmailSubmit: (e: React.FormEvent, selectedRecording: Recording | null) => Promise<void>;
  closeEmailModal: () => void;
  handleExportPDF: (recording: Recording) => Promise<void>;
  handleExportGoogleDocs: (recording: Recording, setError: (error: string | null) => void) => Promise<void>;
  handleCopyToClipboard: (setError: (error: string | null) => void) => Promise<void>;
  closeGoogleDocsModal: () => void;
}

const GOOGLE_TOKENS_KEY = 'google_docs_tokens';

export function useShareMenu(): UseShareMenuReturn {
  const [shareMenuOpen, setShareMenuOpen] = useState<string | null>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);
  
  // Email state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailToSend, setEmailToSend] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  
  // Export state
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingGoogleDocs, setExportingGoogleDocs] = useState(false);
  const [creatingGoogleDoc, setCreatingGoogleDoc] = useState(false);
  const [googleDocsModalOpen, setGoogleDocsModalOpen] = useState(false);
  const [googleDocsContent, setGoogleDocsContent] = useState('');
  const [copiedToClipboard, setCopiedToClipboard] = useState(false);
  const [googleTokens, setGoogleTokens] = useState<GoogleTokens | null>(null);
  
  // Refs for timeout cleanup
  const emailTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipboardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }
      if (clipboardTimeoutRef.current) {
        clearTimeout(clipboardTimeoutRef.current);
      }
    };
  }, []);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuOpen && shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShareMenuOpen(null);
      }
    };

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (shareMenuOpen) {
      // Use setTimeout to avoid immediate closing when opening
      timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [shareMenuOpen]);

  /**
   * Handle share button click
   */
  const handleShareClick = useCallback((recording: Recording, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareMenuOpen(shareMenuOpen === recording.id ? null : recording.id);
  }, [shareMenuOpen]);

  /**
   * Open email modal for a recording
   */
  const handleSendEmail = useCallback(async (
    recording: Recording,
    loadTranscription: (id: string) => Promise<void>,
    transcriptionRecordingId?: string
  ) => {
    setEmailToSend('');
    setEmailSuccess(null);

    // Load transcription if not already loaded
    if (transcriptionRecordingId !== recording.id) {
      await loadTranscription(recording.id);
    }

    setEmailModalOpen(true);
  }, []);

  /**
   * Submit email form
   */
  const handleEmailSubmit = useCallback(async (e: React.FormEvent, selectedRecording: Recording | null) => {
    e.preventDefault();
    if (!selectedRecording || !emailToSend.trim()) return;

    setSendingEmail(true);
    setEmailSuccess(null);

    try {
      await api.sendRecordingEmail(selectedRecording.id, emailToSend.trim());
      setEmailSuccess('E-Mail wurde erfolgreich versendet!');

      // Clear previous timeout if exists
      if (emailTimeoutRef.current) {
        clearTimeout(emailTimeoutRef.current);
      }

      emailTimeoutRef.current = setTimeout(() => {
        setEmailModalOpen(false);
        setEmailToSend('');
        setEmailSuccess(null);
        emailTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      throw err; // Re-throw for error handling in component
    } finally {
      setSendingEmail(false);
    }
  }, [emailToSend]);

  /**
   * Close email modal
   */
  const closeEmailModal = useCallback(() => {
    setEmailModalOpen(false);
    setEmailToSend('');
    setEmailSuccess(null);
  }, []);

  /**
   * Export recording as PDF
   */
  const handleExportPDF = useCallback(async (recording: Recording) => {
    setExportingPDF(true);
    setShareMenuOpen(null);

    try {
      const blob = await api.exportPDF(recording.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recording.original_filename || recording.filename || 'recording'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } finally {
      setExportingPDF(false);
    }
  }, []);

  /**
   * Create Google Doc with tokens
   */
  const createGoogleDocWithTokens = useCallback(async (
    recording: Recording,
    tokens: GoogleTokens
  ): Promise<boolean> => {
    setCreatingGoogleDoc(true);

    try {
      const response = await api.createGoogleDoc(recording.id, tokens);
      if (response.data) {
        // Store tokens for future use
        localStorage.setItem(GOOGLE_TOKENS_KEY, JSON.stringify(tokens));
        setGoogleTokens(tokens);
        
        alert(`Dokument erfolgreich erstellt!\n\nTitel: ${response.data.title}\n\nDas Dokument wird jetzt in einem neuen Tab geöffnet.`);
        window.open(response.data.documentUrl, '_blank');
        return true;
      }
      return false;
    } finally {
      setCreatingGoogleDoc(false);
      setExportingGoogleDocs(false);
    }
  }, []);

  /**
   * Export to Google Docs
   */
  const handleExportGoogleDocs = useCallback(async (
    recording: Recording,
    setError: (error: string | null) => void
  ) => {
    setExportingGoogleDocs(true);

    try {
      // Check if we already have tokens
      let tokens = googleTokens;

      // Try to get tokens from localStorage
      if (!tokens) {
        const storedTokens = localStorage.getItem(GOOGLE_TOKENS_KEY);
        if (storedTokens) {
          tokens = JSON.parse(storedTokens);
          setGoogleTokens(tokens);
        }
      }

      if (tokens && tokens.access_token) {
        // We have tokens, create document directly
        const success = await createGoogleDocWithTokens(recording, tokens);
        if (success) setShareMenuOpen(null);
      } else {
        // No tokens, start OAuth flow
        const authResponse = await api.getGoogleDocsAuthUrl();
        if (authResponse.data?.authUrl) {
          // Store recording ID in sessionStorage for after OAuth callback
          sessionStorage.setItem('pending_google_docs_recording', recording.id);
          // Open OAuth window
          window.location.href = authResponse.data.authUrl;
        } else {
          throw new Error('Google OAuth ist nicht konfiguriert. Bitte kontaktieren Sie den Administrator.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Google Docs Export');
      setExportingGoogleDocs(false);
    }
  }, [googleTokens, createGoogleDocWithTokens]);

  /**
   * Copy Google Docs content to clipboard
   */
  const handleCopyToClipboard = useCallback(async (setError: (error: string | null) => void) => {
    try {
      // Create a temporary div to extract text content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = googleDocsContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';

      await navigator.clipboard.writeText(textContent);
      setCopiedToClipboard(true);

      // Clear previous timeout if exists
      if (clipboardTimeoutRef.current) {
        clearTimeout(clipboardTimeoutRef.current);
      }

      clipboardTimeoutRef.current = setTimeout(() => {
        setCopiedToClipboard(false);
        clipboardTimeoutRef.current = null;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      setError('Fehler beim Kopieren in die Zwischenablage');
    }
  }, [googleDocsContent]);

  /**
   * Close Google Docs modal
   */
  const closeGoogleDocsModal = useCallback(() => {
    setGoogleDocsModalOpen(false);
    setGoogleDocsContent('');
    setCopiedToClipboard(false);
  }, []);

  return {
    shareMenuOpen,
    shareMenuRef: shareMenuRef as React.RefObject<HTMLDivElement>,
    emailModalOpen,
    emailToSend,
    sendingEmail,
    emailSuccess,
    exportingPDF,
    exportingGoogleDocs,
    creatingGoogleDoc,
    googleDocsModalOpen,
    googleDocsContent,
    copiedToClipboard,
    setShareMenuOpen,
    setEmailModalOpen,
    setEmailToSend,
    setEmailSuccess,
    setGoogleDocsModalOpen,
    setGoogleDocsContent,
    setCopiedToClipboard,
    handleShareClick,
    handleSendEmail,
    handleEmailSubmit,
    closeEmailModal,
    handleExportPDF,
    handleExportGoogleDocs,
    handleCopyToClipboard,
    closeGoogleDocsModal,
  };
}

export default useShareMenu;
