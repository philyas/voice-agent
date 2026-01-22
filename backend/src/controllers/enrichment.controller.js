/**
 * Enrichment Controller
 * Handles HTTP requests for AI enrichments
 */

const BaseController = require('./base.controller');
const enrichmentService = require('../services/enrichment.service');
const { ApiError } = require('../middleware/error.middleware');

class EnrichmentController extends BaseController {
  /**
   * Get all enrichments
   * GET /api/v1/enrichments
   */
  async getAll(req, res, next) {
    try {
      const { type } = req.query;
      const pagination = this.parsePagination(req.query);
      
      const enrichments = await enrichmentService.getAllEnrichments({
        ...pagination,
        type,
      });

      return this.paginated(res, enrichments, pagination);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get enrichment by ID
   * GET /api/v1/enrichments/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      
      const enrichment = await enrichmentService.getEnrichmentById(id);
      this.getEntityOr404(enrichment, 'Enrichment');

      return this.success(res, enrichment);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update enrichment content
   * PATCH /api/v1/enrichments/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      this.validateRequired(req.body, ['content']);

      const enrichment = await enrichmentService.updateEnrichment(id, { content });
      this.getEntityOr404(enrichment, 'Enrichment');

      return this.success(res, enrichment, { message: 'Enrichment updated successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete enrichment
   * DELETE /api/v1/enrichments/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      
      const deleted = await enrichmentService.deleteEnrichment(id);
      this.getEntityOr404(deleted, 'Enrichment');

      return this.success(res, null, { message: 'Enrichment deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get available enrichment types
   * GET /api/v1/enrichments/types
   */
  async getTypes(req, res, next) {
    try {
      const types = enrichmentService.getAvailableTypes();
      return this.success(res, types);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get enrichment statistics
   * GET /api/v1/enrichments/stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await enrichmentService.getStats();
      return this.success(res, stats);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EnrichmentController();
