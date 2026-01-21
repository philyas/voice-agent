/**
 * Enrichment Controller
 * Handles HTTP requests for AI enrichments
 */

const enrichmentService = require('../services/enrichment.service');
const { ApiError } = require('../middleware/error.middleware');

class EnrichmentController {
  /**
   * Get all enrichments
   * GET /api/v1/enrichments
   */
  async getAll(req, res, next) {
    try {
      const { limit = 50, offset = 0, type } = req.query;
      
      const enrichments = await enrichmentService.getAllEnrichments({
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        type,
      });

      res.json({
        success: true,
        data: enrichments,
        meta: {
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10),
          count: enrichments.length,
        },
      });
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
      
      if (!enrichment) {
        throw new ApiError(404, 'Enrichment not found');
      }

      res.json({
        success: true,
        data: enrichment,
      });
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
      
      if (content === undefined) {
        throw new ApiError(400, 'Content is required');
      }

      const enrichment = await enrichmentService.updateEnrichment(id, { content });
      
      if (!enrichment) {
        throw new ApiError(404, 'Enrichment not found');
      }

      res.json({
        success: true,
        data: enrichment,
        message: 'Enrichment updated successfully',
      });
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
      
      if (!deleted) {
        throw new ApiError(404, 'Enrichment not found');
      }

      res.json({
        success: true,
        message: 'Enrichment deleted successfully',
      });
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

      res.json({
        success: true,
        data: types,
      });
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

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EnrichmentController();
