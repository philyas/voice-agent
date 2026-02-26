'use client';

import { useRouter } from 'next/navigation';
import { RAGChat, Navigation } from '@/components';

export default function ChatPage() {
  const router = useRouter();

  const handleSourceClick = (recordingId: string) => {
    router.push(`/history?recording=${recordingId}`);
  };

  return (
    <main className="min-h-screen min-h-[100dvh] flex flex-col relative z-10 bg-dark-50/30">
      {/* Header */}
      <Navigation 
        title="AI-Assistant"
        subtitle="Intelligente Suche über deine Aufnahmen"
      />

      {/* Chat: fills viewport below header, input stays at bottom (Safari/Chrome, mobile/tablet) */}
      <div className="flex-1 flex flex-col min-h-0 w-full max-w-5xl mx-auto px-0 sm:px-4">
        <RAGChat
          onSourceClick={handleSourceClick}
          className="flex-1 min-h-0 w-full"
        />
      </div>
    </main>
  );
}
