/**
 * Transcription Controller
 * Handles HTTP requests for transcriptions
 */

const BaseController = require('./base.controller');
const transcriptionService = require('../services/transcription.service');
const enrichmentService = require('../services/enrichment.service');
const { ApiError } = require('../middleware/error.middleware');

class TranscriptionController extends BaseController {
  /**
   * Get all transcriptions
   * GET /api/v1/transcriptions
   */
  async getAll(req, res, next) {
    try {
      const pagination = this.parsePagination(req.query);
      
      const transcriptions = await transcriptionService.getAllTranscriptions(pagination);

      return this.paginated(res, transcriptions, pagination);
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
      this.getEntityOr404(transcription, 'Transcription');

      return this.success(res, transcription);
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

      this.validateRequired(req.body, ['text']);
      this.validateType(req.body, 'text', 'string');

      const transcription = await transcriptionService.updateTranscriptionText(id, text);
      this.getEntityOr404(transcription, 'Transcription');

      return this.success(res, transcription, { message: 'Transcription updated successfully' });
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
      this.getEntityOr404(deleted, 'Transcription');

      return this.success(res, null, { message: 'Transcription deleted successfully' });
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
      const { type = 'summary', customPrompt, temperature, targetLanguage } = req.body;

      const result = await enrichmentService.enrichTranscription(id, type, {
        customPrompt,
        temperature,
        targetLanguage,
      });

      return this.created(res, {
        ...result.enrichment,
        usage: result.usage,
      }, 'Enrichment created successfully');
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

      return this.success(res, enrichments);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a manual enrichment (without AI)
   * POST /api/v1/transcriptions/:id/enrichments/manual
   */
  async createManualEnrichment(req, res, next) {
    try {
      const { id } = req.params;
      const { type, content = '' } = req.body;

      // Validate type
      const validTypes = ['action_items', 'notes', 'key_points'];
      if (!type || !validTypes.includes(type)) {
        throw new ApiError(400, `Invalid type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Check if transcription exists
      const transcription = await transcriptionService.getTranscriptionById(id);
      if (!transcription) {
        throw new ApiError(404, 'Transcription not found');
      }

      // Create enrichment without AI
      const enrichment = await enrichmentService.createManualEnrichment(id, type, content);

      return this.created(res, enrichment, 'Manual enrichment created successfully');
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

      return this.success(res, {
        totalTranscriptions: count,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TranscriptionController();
