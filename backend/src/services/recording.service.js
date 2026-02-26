/**
 * Recording Service
 * Business logic for audio recordings
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const recordingModel = require('../models/recording.model');
const logger = require('../utils/logger.util');
const { env } = require('../config');

/**
 * Generate a friendly default title for a new recording (German locale)
 */
function getDefaultRecordingTitle() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `Aufnahme ${day}.${month}.${year}, ${hours}:${minutes}`;
}

/**
 * Check if the filename is our generic default (e.g. recording-1234567890.webm)
 */
function isGenericRecordingFilename(name) {
  return /^recording-\d+\.\w+$/i.test(name || '');
}

class RecordingService {
  constructor() {
    this.uploadDir = env.UPLOADS_DIR;
  }

  /**
   * Ensure upload directory and temp subdir exist
   */
  async ensureUploadDir() {
    const tempDir = path.join(this.uploadDir, 'temp');
    await fs.mkdir(tempDir, { recursive: true });
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

    const originalFilename =
      isGenericRecordingFilename(file.originalname)
        ? getDefaultRecordingTitle()
        : file.originalname;

    const recording = await recordingModel.createRecording({
      filename,
      originalFilename,
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
   * Update recording title (display name)
   * @param {string} id - Recording UUID
   * @param {string} title - New title (original_filename)
   * @returns {Promise<Object|null>}
   */
  async updateTitle(id, title) {
    const trimmed = typeof title === 'string' ? title.trim() : '';
    if (!trimmed) return recordingModel.findById(id);
    return recordingModel.update(id, { original_filename: trimmed });
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
