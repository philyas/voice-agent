/**
 * API Client
 * Handles all communication with the backend API
 */

import type {
  ApiResponse,
  Recording,
  Transcription,
  Enrichment,
  EnrichmentType,
  RAGSource,
  RAGChatResponse,
  RAGSearchResponse,
  RAGSearchResult,
  RAGSimilarResponse,
  RAGEmbedAllResponse,
  RAGStatsResponse,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || 'An error occurred');
  }
  
  return data;
}

export const api = {
  // Health check
  async health(): Promise<ApiResponse<{ message: string; timestamp: string }>> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse<{ message: string; timestamp: string }>(response);
  },

  // Recordings
  async getRecordings(): Promise<ApiResponse<Recording[]>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/recordings`);
    return handleResponse(response);
  },

  async getRecording(id: string): Promise<ApiResponse<Recording>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/recordings/${id}`);
    return handleResponse(response);
  },

  async uploadRecording(audioBlob: Blob, filename: string): Promise<ApiResponse<Recording>> {
    const formData = new FormData();
    formData.append('audio', audioBlob, filename);

    const response = await fetch(`${API_BASE_URL}/api/v1/recordings`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(response);
  },

  async deleteRecording(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/recordings/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  getRecordingAudioUrl(id: string): string {
    return `${API_BASE_URL}/api/v1/recordings/${id}/audio`;
  },

  async transcribeRecording(id: string, language = 'de'): Promise<ApiResponse<Transcription>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/recordings/${id}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language }),
    });
    return handleResponse(response);
  },

  // Transcriptions
  async getTranscriptions(): Promise<ApiResponse<Transcription[]>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/transcriptions`);
    return handleResponse(response);
  },

  async getTranscription(id: string): Promise<ApiResponse<Transcription>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/transcriptions/${id}`);
    return handleResponse(response);
  },

  async updateTranscription(id: string, text: string): Promise<ApiResponse<Transcription>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/transcriptions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    return handleResponse(response);
  },

  async enrichTranscription(
    id: string,
    type: EnrichmentType,
    customPrompt?: string,
    targetLanguage?: string
  ): Promise<ApiResponse<Enrichment>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/transcriptions/${id}/enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, customPrompt, targetLanguage }),
    });
    return handleResponse(response);
  },

  // Enrichments
  async getEnrichmentTypes(): Promise<ApiResponse<string[]>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/enrichments/types`);
    return handleResponse(response);
  },

  async updateEnrichment(id: string, content: string): Promise<ApiResponse<Enrichment>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/enrichments/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });
    return handleResponse(response);
  },

  async createManualEnrichment(
    transcriptionId: string,
    type: 'action_items' | 'notes' | 'key_points',
    content: string = ''
  ): Promise<ApiResponse<Enrichment>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/transcriptions/${transcriptionId}/enrichments/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, content }),
    });
    return handleResponse(response);
  },

  async deleteEnrichment(id: string): Promise<ApiResponse<void>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/enrichments/${id}`, {
      method: 'DELETE',
    });
    return handleResponse(response);
  },

  // Email
  async sendRecordingEmail(recordingId: string, email: string): Promise<ApiResponse<{ messageId: string }>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/recordings/${recordingId}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return handleResponse(response);
  },

  // Export
  async exportPDF(recordingId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/v1/recordings/${recordingId}/export/pdf`);
    if (!response.ok) {
      throw new Error('PDF export failed');
    }
    return response.blob();
  },

  async exportGoogleDocs(recordingId: string): Promise<ApiResponse<{ html: string; instructions: string }>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/recordings/${recordingId}/export/google-docs`);
    return handleResponse(response);
  },

  // Google Docs Integration
  async getGoogleDocsAuthUrl(): Promise<ApiResponse<{ authUrl: string }>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/google-docs/auth`);
    return handleResponse(response);
  },

  async createGoogleDoc(recordingId: string, tokens: any): Promise<ApiResponse<{ documentId: string; documentUrl: string; title: string }>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/google-docs/create/${recordingId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tokens }),
    });
    return handleResponse(response);
  },

  // RAG (Retrieval-Augmented Generation)
  async ragChat(
    question: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    options: { topK?: number; minSimilarity?: number; language?: string } = {}
  ): Promise<ApiResponse<RAGChatResponse>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/rag/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question, history, options }),
    });
    return handleResponse(response);
  },

  async ragSearch(
    query: string,
    limit = 10,
    minSimilarity = 0.6
  ): Promise<ApiResponse<RAGSearchResponse>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/rag/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit, minSimilarity }),
    });
    return handleResponse(response);
  },

  async ragFindSimilar(
    transcriptionId: string,
    limit = 5
  ): Promise<ApiResponse<RAGSimilarResponse>> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/rag/similar/${transcriptionId}?limit=${limit}`
    );
    return handleResponse(response);
  },

  async ragEmbedAll(): Promise<ApiResponse<RAGEmbedAllResponse>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/rag/embed-all`, {
      method: 'POST',
    });
    return handleResponse(response);
  },

  async ragGetStats(): Promise<ApiResponse<RAGStatsResponse>> {
    const response = await fetch(`${API_BASE_URL}/api/v1/rag/stats`);
    return handleResponse(response);
  },
};

// Re-export types from centralized types file for backwards compatibility
export type { 
  Recording, 
  Transcription, 
  Enrichment, 
  EnrichmentType, 
  ApiResponse,
  RAGChatResponse,
  RAGSearchResponse,
  RAGSimilarResponse,
  RAGSource,
  RAGSearchResult,
  RAGStatsResponse,
} from './types';
