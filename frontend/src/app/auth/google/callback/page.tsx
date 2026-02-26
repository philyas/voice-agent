'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function GoogleAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verarbeite Autorisierung...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const tokensParam = searchParams.get('tokens');
        const pendingRecordingId = sessionStorage.getItem('pending_google_docs_recording');

        if (!tokensParam) {
          setStatus('error');
          setMessage('Keine Tokens erhalten. Bitte versuchen Sie es erneut.');
          setTimeout(() => router.push('/history'), 3000);
          return;
        }

        // Parse tokens
        const tokens = JSON.parse(decodeURIComponent(tokensParam));
        
        // Store tokens in localStorage
        localStorage.setItem('google_docs_tokens', JSON.stringify(tokens));

        // If there's a pending recording, create the document
        if (pendingRecordingId) {
          setMessage('Erstelle Dokument in Google Drive...');
          
          try {
            const response = await api.createGoogleDoc(pendingRecordingId, tokens);
            
            if (response.data && response.data.documentUrl) {
              const documentData = response.data;
              setStatus('success');
              setMessage(`Dokument erfolgreich erstellt: ${documentData.title}`);
              
              // Clean up
              sessionStorage.removeItem('pending_google_docs_recording');
              
              // Open document in new tab
              setTimeout(() => {
                window.open(documentData.documentUrl, '_blank');
                router.push('/history');
              }, 2000);
            }
          } catch (docError) {
            setStatus('error');
            setMessage('Fehler beim Erstellen des Dokuments. Die Autorisierung war erfolgreich, aber das Dokument konnte nicht erstellt werden.');
            sessionStorage.removeItem('pending_google_docs_recording');
            setTimeout(() => router.push('/history'), 3000);
          }
        } else {
          // No pending recording, just store tokens
          setStatus('success');
          setMessage('Google-Autorisierung erfolgreich! Sie können jetzt Dokumente exportieren.');
          setTimeout(() => router.push('/history'), 2000);
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage('Fehler beim Verarbeiten der Autorisierung. Bitte versuchen Sie es erneut.');
        setTimeout(() => router.push('/history'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="bg-dark-850 border border-dark-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 rounded-full border-4 border-dark-700 border-t-ptw-500 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Autorisierung läuft...</h2>
              <p className="text-dark-400">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-ptw-500/10 border-2 border-ptw-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-ptw-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Erfolgreich!</h2>
              <p className="text-dark-400 mb-4">{message}</p>
              <p className="text-sm text-dark-500">Sie werden weitergeleitet...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-500/10 border-2 border-red-500 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Fehler</h2>
              <p className="text-dark-400 mb-4">{message}</p>
              <p className="text-sm text-dark-500">Sie werden zur Historie weitergeleitet...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoogleAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="bg-dark-850 border border-dark-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full border-4 border-dark-700 border-t-ptw-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Lädt...</h2>
            <p className="text-dark-400">Verarbeite Autorisierung...</p>
          </div>
        </div>
      </div>
    }>
      <GoogleAuthCallbackContent />
    </Suspense>
  );
}
