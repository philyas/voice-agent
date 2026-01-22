/**
 * Transcription Model
 * Database operations for transcriptions
 */

const BaseModel = require('./base.model');

class TranscriptionModel extends BaseModel {
  constructor() {
    super('transcriptions');
  }

  /**
   * Create a new transcription
   * @param {Object} data - Transcription data
   * @returns {Promise<Object>}
   */
  async createTranscription(data) {
    return this.create({
      recording_id: data.recordingId,
      text: data.text,
      language: data.language || 'de',
      duration_seconds: data.durationSeconds || null,
      provider: data.provider || 'openai-whisper',
      model_used: data.modelUsed || 'whisper-1',
    });
  }

  /**
   * Find transcription by recording ID
   * @param {string} recordingId - Recording UUID
   * @returns {Promise<Object|null>}
   */
  async findByRecordingId(recordingId) {
    return this.findOneWhere({ recording_id: recordingId });
  }

  /**
   * Get transcription with its enrichments
   * @param {string} id - Transcription ID
   * @returns {Promise<Object|null>}
   */
  async findWithEnrichments(id) {
    const transcription = await this.findById(id);
    
    if (!transcription) return null;

    const enrichments = await this.db('enrichments')
      .where({ transcription_id: id })
      .orderBy('created_at', 'desc');

    return {
      ...transcription,
      enrichments,
    };
  }

  /**
   * Get all transcriptions with recording info
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAllWithRecordings(options = {}) {
    const { parsePagination } = require('../utils/pagination.util');
    const pagination = parsePagination(options);
    
    return this.db(this.tableName)
      .select(
        'transcriptions.*',
        'recordings.filename as recording_filename',
        'recordings.original_filename as recording_original_filename'
      )
      .leftJoin('recordings', 'transcriptions.recording_id', 'recordings.id')
      .orderBy('transcriptions.created_at', 'desc')
      .limit(pagination.limit)
      .offset(pagination.offset);
  }

  /**
   * Update transcription text
   * @param {string} id - Transcription ID
   * @param {string} text - New text
   * @returns {Promise<Object|null>}
   */
  async updateText(id, text) {
    return this.update(id, { text });
  }
}

module.exports = new TranscriptionModel();
