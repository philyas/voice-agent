/**
 * Recording Data Service
 * Provides aggregated recording data with transcriptions and enrichments
 * Eliminates code duplication across controllers
 */

const recordingService = require('./recording.service');
const transcriptionService = require('./transcription.service');
const logger = require('../utils/logger.util');

class RecordingDataService {
  /**
   * Get complete recording data with transcription and enrichments
   * @param {string} recordingId - Recording UUID
   * @returns {Promise<Object>} - { recording, transcription, enrichments }
   * @throws {Error} - If recording not found
   */
  async getRecordingWithTranscription(recordingId) {
    // Get recording
    const recording = await recordingService.getRecordingById(recordingId);
    
    if (!recording) {
      return null;
    }

    // Get transcription and enrichments
    let transcription = null;
    let enrichments = [];

    try {
      transcription = await transcriptionService.getTranscriptionByRecordingId(recordingId);
      
      if (transcription) {
        const fullTranscription = await transcriptionService.getTranscriptionById(transcription.id);
        if (fullTranscription?.enrichments) {
          enrichments = fullTranscription.enrichments;
        }
      }
    } catch (err) {
      logger.warn(`No transcription found for recording: ${recordingId}`);
    }

    return {
      recording,
      transcription,
      enrichments,
    };
  }

  /**
   * Get recording with validation
   * @param {string} recordingId - Recording UUID
   * @returns {Promise<Object>} - Recording data
   * @throws {Error} - If recording not found
   */
  async getRecordingOrThrow(recordingId) {
    const data = await this.getRecordingWithTranscription(recordingId);
    
    if (!data) {
      const error = new Error('Recording not found');
      error.statusCode = 404;
      error.code = 'RECORDING_NOT_FOUND';
      throw error;
    }

    return data;
  }
}

module.exports = new RecordingDataService();
