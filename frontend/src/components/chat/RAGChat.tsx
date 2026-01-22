'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, FileText, Calendar, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
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

  const toggleSourceExpanded = (messageId: string) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  // Use centralized utility - format without time for compact display
  const formatDateCompact = (dateString: string) => formatDate(dateString, false);

  const clearChat = () => {
    setMessages([]);
    setExpandedSources(new Set());
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-700/50 bg-gradient-to-r from-dark-850 to-dark-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-600/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-gold-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">AI-Assistant</h2>
            <p className="text-xs text-dark-400">
              Intelligente Fragen zu deinen Aufnahmen
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-dark-800 border border-dark-700/50 rounded-lg text-dark-300 hover:text-red-400 hover:border-red-500/30 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Löschen
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/10 to-gold-600/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-gold-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Frag mich etwas über deine Aufnahmen
            </h3>
            <p className="text-sm text-dark-400 max-w-md mb-6">
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
                  className="px-3 py-1.5 text-xs bg-dark-800 border border-dark-700/50 rounded-lg text-dark-300 hover:text-gold-400 hover:border-gold-500/30 transition-all"
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
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-gold-500/20 to-gold-600/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gold-400" />
              </div>
            )}

            <div
              className={`max-w-[80%] ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-gold-500 to-gold-600 text-dark-950 rounded-2xl rounded-tr-md'
                  : 'bg-dark-800 border border-dark-700/50 text-dark-100 rounded-2xl rounded-tl-md'
              } px-4 py-3`}
            >
              {message.isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                  <span className="text-sm text-dark-400">Denke nach...</span>
                </div>
              ) : (
                <>
                  <div className="text-sm prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-dark-100 prose-strong:text-white prose-ul:text-dark-100 prose-ol:text-dark-100 prose-li:text-dark-100 prose-a:text-gold-400 hover:prose-a:text-gold-300 prose-code:text-gold-300 prose-code:bg-dark-900 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-dark-900 prose-pre:border prose-pre:border-dark-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-dark-700/50">
                      <button
                        onClick={() => toggleSourceExpanded(message.id)}
                        className="flex items-center gap-1.5 text-xs text-dark-400 hover:text-gold-400 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {message.sources.length} Quelle{message.sources.length !== 1 ? 'n' : ''}
                        {expandedSources.has(message.id) ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {expandedSources.has(message.id) && (
                        <div className="mt-2 space-y-2">
                          {message.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className="p-2 bg-dark-900/50 rounded-lg text-xs cursor-pointer hover:bg-dark-900 transition-colors"
                              onClick={() => onSourceClick?.(source.recordingId)}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-dark-200 truncate max-w-[200px]">
                                  {source.filename || 'Unbekannte Aufnahme'}
                                </span>
                                <span className="text-gold-500 font-mono">
                                  {(source.maxSimilarity * 100).toFixed(0)}%
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-dark-500">
                                <Calendar className="w-3 h-3" />
                                <span>{source.date ? formatDateCompact(source.date) : 'Unbekannt'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {message.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-dark-700 to-dark-800 flex items-center justify-center">
                <User className="w-4 h-4 text-dark-300" />
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-dark-700/50 bg-gradient-to-r from-dark-850 to-dark-900">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stelle eine Frage über deine Aufnahmen..."
            rows={1}
            className="flex-1 px-4 py-3 bg-dark-800 border border-dark-700/50 rounded-xl text-white text-sm placeholder-dark-500 focus:outline-none focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20 resize-none transition-all"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-gradient-to-r from-gold-500 to-gold-600 text-dark-950 rounded-xl font-medium hover:from-gold-400 hover:to-gold-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-dark-500 text-center">
          Drücke Enter zum Senden, Shift+Enter für neue Zeile
        </p>
      </div>
    </div>
  );
}

export default RAGChat;
