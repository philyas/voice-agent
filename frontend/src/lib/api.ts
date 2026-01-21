/**
 * API Client
 * Handles all communication with the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiResponse<T> {
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

interface Recording {
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

interface Transcription {
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

interface Enrichment {
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

type EnrichmentType = 'complete' | 'summary' | 'formatted' | 'notes' | 'action_items' | 'key_points' | 'translation' | 'custom';

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
};

export type { Recording, Transcription, Enrichment, EnrichmentType, ApiResponse };
