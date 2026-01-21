/**
 * Transcription Service
 * Business logic for audio transcription using OpenAI Whisper
 */

const transcriptionModel = require('../models/transcription.model');
const recordingModel = require('../models/recording.model');
const openaiService = require('./openai.service');

class TranscriptionService {
  /**
   * Transcribe a recording using OpenAI Whisper
   * @param {string} recordingId - Recording UUID
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} - Transcription result
   */
  async transcribeRecording(recordingId, options = {}) {
    // Check if recording exists
    const recording = await recordingModel.findById(recordingId);
    
    if (!recording) {
      throw new Error('Recording not found');
    }

    // Check if already transcribed
    const existingTranscription = await transcriptionModel.findByRecordingId(recordingId);
    
    if (existingTranscription) {
      return {
        transcription: existingTranscription,
        isNew: false,
      };
    }

    // Check if OpenAI is configured
    if (!openaiService.isConfigured()) {
      throw new Error('OpenAI API key is not configured');
    }

    // Transcribe using Whisper
    const result = await openaiService.transcribeAudio(recording.storage_path, {
      language: options.language || 'de',
      prompt: options.prompt,
    });

    // Save transcription to database
    const transcription = await transcriptionModel.createTranscription({
      recordingId,
      text: result.text,
      language: result.language,
      durationSeconds: result.duration,
      provider: 'openai-whisper',
      modelUsed: 'whisper-1',
    });

    // Update recording duration if available
    if (result.duration) {
      await recordingModel.update(recordingId, {
        duration_ms: Math.round(result.duration * 1000),
      });
    }

    return {
      transcription,
      isNew: true,
    };
  }

  /**
   * Get all transcriptions
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAllTranscriptions(options = {}) {
    return transcriptionModel.findAllWithRecordings(options);
  }

  /**
   * Get transcription by ID
   * @param {string} id - Transcription UUID
   * @returns {Promise<Object|null>}
   */
  async getTranscriptionById(id) {
    return transcriptionModel.findWithEnrichments(id);
  }

  /**
   * Get transcription by recording ID
   * @param {string} recordingId - Recording UUID
   * @returns {Promise<Object|null>}
   */
  async getTranscriptionByRecordingId(recordingId) {
    return transcriptionModel.findByRecordingId(recordingId);
  }

  /**
   * Update transcription text (manual correction)
   * @param {string} id - Transcription UUID
   * @param {string} text - Corrected text
   * @returns {Promise<Object|null>}
   */
  async updateTranscriptionText(id, text) {
    return transcriptionModel.updateText(id, text);
  }

  /**
   * Delete transcription
   * @param {string} id - Transcription UUID
   * @returns {Promise<boolean>}
   */
  async deleteTranscription(id) {
    return transcriptionModel.delete(id);
  }

  /**
   * Get transcription count
   * @returns {Promise<number>}
   */
  async getCount() {
    return transcriptionModel.count();
  }
}

module.exports = new TranscriptionService();
