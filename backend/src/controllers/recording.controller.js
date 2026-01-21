/**
 * Recording Controller
 * Handles HTTP requests for audio recordings
 */

const recordingService = require('../services/recording.service');
const transcriptionService = require('../services/transcription.service');
const { ApiError } = require('../middleware/error.middleware');

class RecordingController {
  /**
   * Get all recordings
   * GET /api/v1/recordings
   */
  async getAll(req, res, next) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const recordings = await recordingService.getAllRecordings({
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

      res.json({
        success: true,
        data: recordings,
        meta: {
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          count: recordings.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recording by ID
   * GET /api/v1/recordings/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      
      const recording = await recordingService.getRecordingById(id);
      
      if (!recording) {
        throw new ApiError(404, 'Recording not found');
      }

      res.json({
        success: true,
        data: recording,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new recording (upload audio)
   * POST /api/v1/recordings
   */
  async create(req, res, next) {
    try {
      if (!req.file) {
        throw new ApiError(400, 'No audio file uploaded');
      }

      const recording = await recordingService.createRecording(req.file);

      res.status(201).json({
        success: true,
        data: recording,
        message: 'Recording uploaded successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete recording
   * DELETE /api/v1/recordings/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      
      const deleted = await recordingService.deleteRecording(id);
      
      if (!deleted) {
        throw new ApiError(404, 'Recording not found');
      }

      res.json({
        success: true,
        message: 'Recording deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transcribe a recording
   * POST /api/v1/recordings/:id/transcribe
   */
  async transcribe(req, res, next) {
    try {
      const { id } = req.params;
      const { language = 'de' } = req.body;
      
      const result = await transcriptionService.transcribeRecording(id, { language });

      res.status(result.isNew ? 201 : 200).json({
        success: true,
        data: result.transcription,
        message: result.isNew 
          ? 'Transcription created successfully' 
          : 'Transcription already exists',
        isNew: result.isNew,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recording statistics
   * GET /api/v1/recordings/stats
   */
  async getStats(req, res, next) {
    try {
      const count = await recordingService.getCount();

      res.json({
        success: true,
        data: {
          totalRecordings: count,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RecordingController();
