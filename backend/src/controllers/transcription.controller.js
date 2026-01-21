/**
 * Transcription Controller
 * Handles HTTP requests for transcriptions
 */

const transcriptionService = require('../services/transcription.service');
const enrichmentService = require('../services/enrichment.service');
const { ApiError } = require('../middleware/error.middleware');

class TranscriptionController {
  /**
   * Get all transcriptions
   * GET /api/v1/transcriptions
   */
  async getAll(req, res, next) {
    try {
      const { limit = 50, offset = 0 } = req.query;
      
      const transcriptions = await transcriptionService.getAllTranscriptions({
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });

      res.json({
        success: true,
        data: transcriptions,
        meta: {
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          count: transcriptions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transcription by ID (with enrichments)
   * GET /api/v1/transcriptions/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      
      const transcription = await transcriptionService.getTranscriptionById(id);
      
      if (!transcription) {
        throw new ApiError(404, 'Transcription not found');
      }

      res.json({
        success: true,
        data: transcription,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update transcription text
   * PATCH /api/v1/transcriptions/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        throw new ApiError(400, 'Text is required');
      }

      const transcription = await transcriptionService.updateTranscriptionText(id, text);
      
      if (!transcription) {
        throw new ApiError(404, 'Transcription not found');
      }

      res.json({
        success: true,
        data: transcription,
        message: 'Transcription updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete transcription
   * DELETE /api/v1/transcriptions/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      
      const deleted = await transcriptionService.deleteTranscription(id);
      
      if (!deleted) {
        throw new ApiError(404, 'Transcription not found');
      }

      res.json({
        success: true,
        message: 'Transcription deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enrich a transcription
   * POST /api/v1/transcriptions/:id/enrich
   */
  async enrich(req, res, next) {
    try {
      const { id } = req.params;
      const { type = 'summary', customPrompt, temperature } = req.body;

      const result = await enrichmentService.enrichTranscription(id, type, {
        customPrompt,
        temperature,
      });

      res.status(201).json({
        success: true,
        data: result.enrichment,
        usage: result.usage,
        message: 'Enrichment created successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get enrichments for a transcription
   * GET /api/v1/transcriptions/:id/enrichments
   */
  async getEnrichments(req, res, next) {
    try {
      const { id } = req.params;

      // Check if transcription exists
      const transcription = await transcriptionService.getTranscriptionById(id);
      
      if (!transcription) {
        throw new ApiError(404, 'Transcription not found');
      }

      const enrichments = await enrichmentService.getEnrichmentsByTranscriptionId(id);

      res.json({
        success: true,
        data: enrichments,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transcription statistics
   * GET /api/v1/transcriptions/stats
   */
  async getStats(req, res, next) {
    try {
      const count = await transcriptionService.getCount();

      res.json({
        success: true,
        data: {
          totalTranscriptions: count,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TranscriptionController();
