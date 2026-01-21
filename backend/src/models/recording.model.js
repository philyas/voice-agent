/**
 * Recording Model
 * Database operations for audio recordings
 */

const BaseModel = require('./base.model');

class RecordingModel extends BaseModel {
  constructor() {
    super('recordings');
  }

  /**
   * Create a new recording
   * @param {Object} data - Recording data
   * @returns {Promise<Object>}
   */
  async createRecording(data) {
    return this.create({
      filename: data.filename,
      original_filename: data.originalFilename,
      mime_type: data.mimeType,
      file_size: data.fileSize,
      duration_ms: data.durationMs || null,
      storage_path: data.storagePath,
    });
  }

  /**
   * Get recording with its transcription
   * @param {string} id - Recording ID
   * @returns {Promise<Object|null>}
   */
  async findWithTranscription(id) {
    const recording = await this.db(this.tableName)
      .select(
        'recordings.*',
        'transcriptions.id as transcription_id',
        'transcriptions.text as transcription_text',
        'transcriptions.language as transcription_language',
        'transcriptions.duration_seconds as transcription_duration'
      )
      .leftJoin('transcriptions', 'recordings.id', 'transcriptions.recording_id')
      .where('recordings.id', id)
      .first();
    
    return recording || null;
  }

  /**
   * Get all recordings with their transcriptions
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAllWithTranscriptions(options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    return this.db(this.tableName)
      .select(
        'recordings.*',
        'transcriptions.id as transcription_id',
        'transcriptions.text as transcription_text'
      )
      .leftJoin('transcriptions', 'recordings.id', 'transcriptions.recording_id')
      .orderBy('recordings.created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  /**
   * Delete recording and cascade to related records
   * @param {string} id - Recording ID
   * @returns {Promise<boolean>}
   */
  async deleteWithRelated(id) {
    // Knex with PostgreSQL will handle cascade if set up in migration
    return this.delete(id);
  }
}

module.exports = new RecordingModel();
