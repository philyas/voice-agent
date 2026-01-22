/**
 * Shared types
 * Centralized type definitions for the application
 */

/**
 * API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  message?: string;
  meta?: {
    limit?: number;
    offset?: number;
    count?: number;
  };
}

/**
 * Recording entity
 */
export interface Recording {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  duration_ms: number | null;
  storage_path: string;
  created_at: string;
  updated_at: string;
  transcription_id?: string;
  transcription_text?: string;
}

/**
 * Transcription entity
 */
export interface Transcription {
  id: string;
  recording_id: string;
  text: string;
  language: string;
  duration_seconds: number | null;
  provider: string;
  model_used: string;
  created_at: string;
  updated_at: string;
  enrichments?: Enrichment[];
}

/**
 * Enrichment entity
 */
export interface Enrichment {
  id: string;
  transcription_id: string;
  type: string;
  content: string;
  prompt_used: string | null;
  model_used: string;
  tokens_used: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Available enrichment types
 */
export type EnrichmentType =
  | 'complete'
  | 'summary'
  | 'formatted'
  | 'notes'
  | 'action_items'
  | 'key_points'
  | 'translation'
  | 'custom';

/**
 * RAG (Retrieval-Augmented Generation) types
 */
export interface RAGSource {
  recordingId: string;
  transcriptionId: string;
  filename: string;
  date: string;
  chunks: Array<{
    content: string;
    similarity: number;
    type: string;
  }>;
  maxSimilarity: number;
}

export interface RAGChatResponse {
  answer: string;
  sources: RAGSource[];
  hasContext: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  relevantChunks?: number;
}

export interface RAGSearchResult {
  content: string;
  similarity: number;
  sourceType: string;
  sourceId: string;
  transcriptionId: string;
  recordingId: string;
  recordingFilename: string;
  recordingDate: string;
}

export interface RAGSearchResponse {
  query: string;
  results: RAGSearchResult[];
  count: number;
}

export interface RAGSimilarResponse {
  transcriptionId: string;
  similar: Array<{
    content: string;
    similarity: number;
    transcriptionId: string;
    recordingId: string;
    recordingFilename: string;
    recordingDate: string;
  }>;
  count: number;
}

export interface RAGEmbedAllResponse {
  transcriptions: {
    embedded: number;
    skipped: number;
    errors: number;
    total: number;
  };
  enrichments: {
    embedded: number;
    skipped: number;
    errors: number;
    total: number;
  };
}

export interface RAGStatsResponse {
  total: number;
  byType: {
    transcription?: {
      embeddings: number;
      uniqueSources: number;
    };
    enrichment?: {
      embeddings: number;
      uniqueSources: number;
    };
  };
}

/**
 * Parsed enrichment section for display
 */
export interface ParsedEnrichmentSection {
  title: string;
  items: ParsedEnrichmentItem[];
  textContent: string;
  textStartIndex: number;
  textEndIndex: number;
  isListSection: boolean;
}

export interface ParsedEnrichmentItem {
  text: string;
  lineIndex: number;
  isCheckbox: boolean;
  isChecked: boolean;
  isNumbered: boolean;
}

/**
 * Enrichment data for local state
 */
export interface EnrichmentData {
  id?: string;
  type: string;
  content: string;
}

/**
 * Chat message for RAG chat
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: RAGSource[];
  timestamp: Date;
  isLoading?: boolean;
}
