'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, FileText, Calendar } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { RAGSource, ChatMessage } from '@/lib/types';

interface RAGChatProps {
  onSourceClick?: (recordingId: string) => void;
  className?: string;
}

export function RAGChat({ onSourceClick, className = '' }: RAGChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const loadingMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history from previous messages (last 10 exchanges)
      const history = messages
        .slice(-20)
        .filter(m => !m.isLoading)
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      const response = await api.ragChat(userMessage.content, history, {
        topK: 5,
        minSimilarity: 0.0, // No minimum threshold - use top-K only
        language: 'de',
      });

      if (response.data) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: response.data.answer,
          sources: response.data.sources,
          timestamp: new Date(),
        };

        setMessages(prev => prev.filter(m => !m.isLoading).concat(assistantMessage));
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.',
        timestamp: new Date(),
      };

      setMessages(prev => prev.filter(m => !m.isLoading).concat(errorMessage));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Use centralized utility - format without time for compact display
  const formatDateCompact = (dateString: string) => formatDate(dateString, false);

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      {/* Messages - scrollable, takes remaining space */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center min-h-[200px] text-center py-8 sm:py-12">
            <div className="w-16 h-16 rounded-2xl bg-ptw-500/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-ptw-500" />
            </div>
            <h3 className="text-lg font-medium text-dark-800 mb-2">
              Frag mich etwas über deine Aufnahmen
            </h3>
            <p className="text-sm text-dark-500 max-w-md mb-6">
              Ich kann Informationen aus deinen Transkriptionen und Enrichments finden
              und zusammenfassen.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                'Was wurde in meinen Aufnahmen besprochen?',
                'Welche Action Items gibt es?',
                'Zusammenfassung aller Meetings',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-3 py-1.5 text-xs bg-dark-100 border border-dark-200 rounded-lg text-dark-600 hover:bg-dark-200 hover:border-dark-300 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-ptw-500/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-ptw-500" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[80%] ${
                message.role === 'user'
                  ? 'bg-dark-100 border border-dark-200 text-dark-800 rounded-2xl rounded-tr-md'
                  : 'bg-white border border-dark-200 text-dark-800 rounded-2xl rounded-tl-md shadow-sm'
              } px-4 py-3`}
            >
              {message.isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-ptw-500" />
                  <span className="text-sm text-dark-500">Denke nach...</span>
                </div>
              ) : (
                <>
                  <div className="text-sm prose prose-sm max-w-none prose-headings:text-dark-800 prose-p:text-dark-700 prose-strong:text-dark-800 prose-ul:text-dark-700 prose-ol:text-dark-700 prose-li:text-dark-700 prose-a:text-ptw-500 hover:prose-a:text-ptw-600 prose-code:text-dark-800 prose-code:bg-dark-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-dark-100 prose-pre:border prose-pre:border-dark-200 prose-pre:text-dark-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* Sources - Only show the best (first) source */}
                  {message.sources && message.sources.length > 0 && (() => {
                    const bestSource = message.sources[0];
                    return (
                      <div className="mt-3 pt-3 border-t border-dark-200">
                        <div
                          className="p-2 bg-dark-50 rounded-lg text-xs cursor-pointer hover:bg-dark-100 transition-colors"
                          onClick={() => onSourceClick?.(bestSource.recordingId)}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <FileText className="w-3.5 h-3.5 text-ptw-500" />
                            <span className="font-medium text-dark-700 truncate max-w-[200px]">
                              {bestSource.filename || 'Unbekannte Aufnahme'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-dark-500">
                            <Calendar className="w-3 h-3" />
                            <span>{bestSource.date ? formatDateCompact(bestSource.date) : 'Unbekannt'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-dark-200 flex items-center justify-center">
                <User className="w-4 h-4 text-dark-600" />
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - always at bottom, safe-area aware */}
      <div className="flex-shrink-0 p-4 pt-3 border-t border-dark-200 bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stelle eine Frage über deine Aufnahmen..."
            rows={1}
            className="flex-1 min-h-[44px] px-4 py-3 bg-dark-50 border border-dark-200 rounded-xl text-dark-800 text-sm placeholder-dark-400 focus:outline-none focus:border-ptw-500/50 focus:ring-1 focus:ring-ptw-500/20 resize-none transition-all"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-gradient-to-r from-ptw-500 to-ptw-600 text-white rounded-xl font-medium hover:from-ptw-400 hover:to-ptw-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <div className="mt-2 flex items-center justify-center gap-3 flex-wrap">
          <p className="text-xs text-dark-500">
            Enter zum Senden, Shift+Enter für neue Zeile
          </p>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="text-xs text-dark-500 hover:text-red-600 transition-colors"
            >
              Chat leeren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RAGChat;
