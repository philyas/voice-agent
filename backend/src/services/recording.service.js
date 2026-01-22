/**
 * Recording Service
 * Business logic for audio recordings
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const recordingModel = require('../models/recording.model');
const logger = require('../utils/logger.util');

class RecordingService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save uploaded audio file and create database record
   * @param {Object} file - Multer file object
   * @returns {Promise<Object>} - Created recording
   */
  async createRecording(file) {
    await this.ensureUploadDir();

    const filename = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    const storagePath = path.join(this.uploadDir, filename);

    // Move file from temp to uploads
    await fs.rename(file.path, storagePath);

    const recording = await recordingModel.createRecording({
      filename,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      storagePath,
    });

    return recording;
  }

  /**
   * Get all recordings
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAllRecordings(options = {}) {
    return recordingModel.findAllWithTranscriptions(options);
  }

  /**
   * Get recording by ID
   * @param {string} id - Recording UUID
   * @returns {Promise<Object|null>}
   */
  async getRecordingById(id) {
    return recordingModel.findWithTranscription(id);
  }

  /**
   * Get recording file path
   * @param {string} id - Recording UUID
   * @returns {Promise<string|null>}
   */
  async getRecordingFilePath(id) {
    const recording = await recordingModel.findById(id);
    
    if (!recording) return null;
    
    return recording.storage_path;
  }

  /**
   * Delete recording and its file
   * @param {string} id - Recording UUID
   * @returns {Promise<boolean>}
   */
  async deleteRecording(id) {
    const recording = await recordingModel.findById(id);
    
    if (!recording) return false;

    // Delete file from disk
    try {
      await fs.unlink(recording.storage_path);
    } catch (error) {
      logger.warn(`Could not delete file: ${recording.storage_path}`, { error: error.message });
    }

    // Delete from database (cascades to transcriptions and enrichments)
    return recordingModel.delete(id);
  }

  /**
   * Update recording duration
   * @param {string} id - Recording UUID
   * @param {number} durationMs - Duration in milliseconds
   * @returns {Promise<Object|null>}
   */
  async updateDuration(id, durationMs) {
    return recordingModel.update(id, { duration_ms: durationMs });
  }

  /**
   * Get recording count
   * @returns {Promise<number>}
   */
  async getCount() {
    return recordingModel.count();
  }
}

module.exports = new RecordingService();
