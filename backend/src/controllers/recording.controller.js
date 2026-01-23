/**
 * Recording Controller
 * Handles HTTP requests for audio recordings
 */

const BaseController = require('./base.controller');
const recordingService = require('../services/recording.service');
const transcriptionService = require('../services/transcription.service');
const { ApiError } = require('../middleware/error.middleware');
const { env } = require('../config');

class RecordingController extends BaseController {
  /**
   * Get all recordings
   * GET /api/v1/recordings
   */
  async getAll(req, res, next) {
    try {
      const pagination = this.parsePagination(req.query);
      
      const recordings = await recordingService.getAllRecordings(pagination);

      return this.paginated(res, recordings, pagination);
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
      this.getEntityOr404(recording, 'Recording');

      return this.success(res, recording);
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

      return this.created(res, recording, 'Recording uploaded successfully');
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
      this.getEntityOr404(deleted, 'Recording');

      return this.success(res, null, { message: 'Recording deleted successfully' });
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

      return this.success(res, {
        totalRecordings: count,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download/stream audio file
   * GET /api/v1/recordings/:id/audio
   */
  async getAudio(req, res, next) {
    try {
      const { id } = req.params;
      
      const filePath = await recordingService.getRecordingFilePath(id);
      
      if (!filePath) {
        throw new ApiError(404, 'Recording not found');
      }

      const recording = await recordingService.getRecordingById(id);
      if (!recording) {
        throw new ApiError(404, 'Recording not found');
      }

      const fs = require('fs');
      const path = require('path');
      
      // Check if file exists
      try {
        await fs.promises.access(filePath);
      } catch {
        throw new ApiError(404, 'Audio file not found');
      }

      const stat = await fs.promises.stat(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // Set CORS headers (reflect request origin when allowed)
      const origin = req.headers.origin;
      if (origin && env.CORS_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

      // Handle Range requests for audio streaming
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': recording.mime_type,
        };
        
        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // Full file request
        const head = {
          'Content-Length': fileSize,
          'Content-Type': recording.mime_type,
          'Accept-Ranges': 'bytes',
        };
        
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RecordingController();
