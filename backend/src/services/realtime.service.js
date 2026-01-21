/**
 * OpenAI Realtime API Service
 * Handles live transcription streaming via WebSocket
 */

const { env } = require('../config/env');

class RealtimeService {
  constructor() {
    this.apiKey = env.OPENAI_API_KEY;
    this.baseUrl = 'https://api.openai.com/v1/realtime';
  }

  /**
   * Check if OpenAI API is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Create a WebSocket connection to OpenAI Realtime API (transcription-only mode)
   * @param {string} language - Language code (default: 'de')
   * @returns {WebSocket}
   */
  createConnection(language = 'de') {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured');
    }

    // Use transcription-only intent
    const ws = new (require('ws'))(
      `wss://api.openai.com/v1/realtime?intent=transcription`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      }
    );

    return ws;
  }

  /**
   * Initialize session for transcription-only mode
   * @param {WebSocket} ws - WebSocket connection
   * @param {string} language - Language code
   */
  initializeSession(ws, language = 'de') {
    const sessionConfig = {
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: {
              type: 'audio/pcm',
              rate: 24000,
            },
            transcription: {
              model: 'gpt-4o-mini-transcribe',
              prompt: '',
              language: language,
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
            noise_reduction: {
              type: 'near_field',
            },
          },
        },
        include: ['item.input_audio_transcription.logprobs'],
      },
    };

    ws.send(JSON.stringify(sessionConfig));
  }

  /**
   * Send audio data to OpenAI
   * @param {WebSocket} ws - WebSocket connection
   * @param {Buffer} audioData - PCM16 audio data
   */
  sendAudio(ws, audioData) {
    const audioEvent = {
      type: 'input_audio_buffer.append',
      audio: audioData.toString('base64'),
    };
    ws.send(JSON.stringify(audioEvent));
  }

  /**
   * Commit audio buffer (finalize current speech turn)
   * @param {WebSocket} ws - WebSocket connection
   */
  commitAudio(ws) {
    const commitEvent = {
      type: 'input_audio_buffer.commit',
    };
    ws.send(JSON.stringify(commitEvent));
  }

  /**
   * Close the connection
   * @param {WebSocket} ws - WebSocket connection
   */
  closeConnection(ws) {
    if (ws.readyState === ws.OPEN) {
      ws.close();
    }
  }
}

module.exports = new RealtimeService();
