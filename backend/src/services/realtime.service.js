/**
 * Deepgram Realtime API Service
 * Handles live transcription streaming via WebSocket
 */

const WebSocket = require('ws');
const { env } = require('../config/env');

class RealtimeService {
  constructor() {
    this.apiKey = env.DEEPGRAM_API_KEY;
    this.baseUrl = 'wss://api.deepgram.com/v1/listen';
    this.sampleRate = 16000;
    // nova-2: unterstützt DE + Streaming + Diarization; nova-2-meeting oft nur EN
    this.defaultModel = env.DEEPGRAM_LIVE_MODEL || 'nova-2';
  }

  /**
   * Check if Deepgram API is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Create a WebSocket connection to Deepgram Realtime API
   * @param {string} language - Language code (default: 'de')
   * @param {string} model - Deepgram model (default: nova-2)
   * @param {number} [sampleRate] - Audio sample rate (default: 16000). Must match client audio.
   * @returns {WebSocket}
   */
  createConnection(language = 'de', model = this.defaultModel, sampleRate = this.sampleRate) {
    if (!this.isConfigured()) {
      throw new Error('Deepgram API key is not configured');
    }

    const rate = Number(sampleRate) || this.sampleRate;
    const params = new URLSearchParams({
      model,
      language,
      encoding: 'linear16',
      sample_rate: String(rate),
      channels: '1',
      interim_results: 'true',
      diarize: 'true',
      utterances: 'true',
      punctuate: 'true',
      smart_format: 'true',
      endpointing: '300',
      utterance_end_ms: '1200',
    });

    return new WebSocket(`${this.baseUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Token ${this.apiKey}`,
      },
    });
  }

  /**
   * Send audio data to Deepgram
   * @param {WebSocket} ws - WebSocket connection
   * @param {Buffer} audioData - PCM16 audio data
   */
  sendAudio(ws, audioData) {
    ws.send(audioData, { binary: true });
  }

  /**
   * Ask Deepgram to finalize current buffered utterance
   * @param {WebSocket} ws - WebSocket connection
   */
  finalizeAudio(ws) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'Finalize' }));
    }
  }

  /**
   * Close the connection
   * @param {WebSocket} ws - WebSocket connection
   */
  closeConnection(ws) {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }
}

module.exports = new RealtimeService();
