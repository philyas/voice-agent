'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mic, History, ArrowLeft, MessageSquare } from 'lucide-react';
import { RAGChat } from '@/components';

export default function ChatPage() {
  const router = useRouter();

  const handleSourceClick = (recordingId: string) => {
    router.push(`/history?recording=${recordingId}`);
  };

  return (
    <main className="min-h-screen flex flex-col relative z-10">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-transparent bg-gradient-to-b from-dark-900/95 via-dark-900/90 to-dark-900/95" style={{ borderImage: 'linear-gradient(90deg, transparent, rgba(212, 168, 83, 0.2), transparent) 1' }}>
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
                <MessageSquare className="w-6 h-6 text-dark-950" strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    <span className="bg-gradient-to-r from-gold-400 via-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
                      EverlastAI
                    </span>
                    <span className="bg-gradient-to-r from-white/90 via-white/70 to-white/90 bg-clip-text text-transparent font-semibold text-lg ml-2">
                      AI-Assistant
                    </span>
                  </h1>
                </div>
                <p className="text-sm bg-gradient-to-r from-dark-400 via-dark-300 to-dark-400 bg-clip-text text-transparent">
                  Intelligente Suche über deine Aufnahmen
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-dark-800 via-dark-800 to-dark-850 border border-dark-700/50 text-dark-300 hover:text-white hover:border-gold-500/30 hover:bg-gradient-to-br hover:from-dark-750 hover:via-dark-800 hover:to-dark-850 transition-all duration-200"
              >
                <Mic className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Aufnahme</span>
              </Link>
              <Link
                href="/history"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-br from-dark-800 via-dark-800 to-dark-850 border border-dark-700/50 text-dark-300 hover:text-white hover:border-gold-500/30 hover:bg-gradient-to-br hover:from-dark-750 hover:via-dark-800 hover:to-dark-850 transition-all duration-200"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Historie</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Chat fills remaining height */}
      <div className="flex-1 max-w-5xl w-full mx-auto">
        <RAGChat 
          onSourceClick={handleSourceClick}
          className="h-[calc(100vh-88px)]"
        />
      </div>
    </main>
  );
}
