'use client';

import { useRouter } from 'next/navigation';
import { RAGChat, Navigation } from '@/components';

export default function ChatPage() {
  const router = useRouter();

  const handleSourceClick = (recordingId: string) => {
    router.push(`/history?recording=${recordingId}`);
  };

  return (
    <main className="min-h-screen flex flex-col relative z-10">
      {/* Header */}
      <Navigation 
        title="AI-Assistant"
        subtitle="Intelligente Suche über deine Aufnahmen"
      />

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
