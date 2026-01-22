/**
 * RAG Controller
 * Handles RAG-related HTTP requests
 */

const BaseController = require('./base.controller');
const ragService = require('../services/rag.service');
const embeddingService = require('../services/embedding.service');
const embeddingModel = require('../models/embedding.model');
const { ApiError } = require('../middleware/error.middleware');

class RAGController extends BaseController {
  /**
   * Validate that OpenAI/embedding service is configured
   * @throws {ApiError} - If service not configured
   */
  validateServiceConfigured() {
    if (!embeddingService.isConfigured()) {
      throw new ApiError(503, 'OpenAI API is not configured');
    }
  }

  /**
   * POST /api/v1/rag/chat
   * Answer a question using RAG
   */
  async chat(req, res, next) {
    try {
      const { question, history = [], options = {} } = req.body;

      this.validateRequired(req.body, ['question']);
      this.validateServiceConfigured();

      const result = await ragService.chat(question.trim(), history, {
        topK: options.topK || 5,
        minSimilarity: options.minSimilarity || 0.0,
        language: options.language || 'de',
      });

      return this.success(res, result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/rag/search
   * Semantic search without answer generation
   */
  async search(req, res, next) {
    try {
      const { query, limit = 10, minSimilarity = 0.6 } = req.body;

      this.validateRequired(req.body, ['query']);
      this.validateServiceConfigured();

      const results = await embeddingService.search(query.trim(), {
        limit,
        minSimilarity,
      });

      return this.success(res, {
        query,
        results: this.formatSearchResults(results),
        count: results.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/rag/similar/:transcriptionId
   * Find similar recordings
   */
  async findSimilar(req, res, next) {
    try {
      const { transcriptionId } = req.params;
      const { limit = 5 } = req.query;

      this.validateServiceConfigured();

      const results = await ragService.findSimilarRecordings(
        transcriptionId,
        parseInt(limit, 10)
      );

      return this.success(res, {
        transcriptionId,
        similar: this.formatSimilarResults(results),
        count: results.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/rag/embed-all
   * Embed all existing transcriptions and enrichments
   */
  async embedAll(req, res, next) {
    try {
      this.validateServiceConfigured();

      const stats = await ragService.embedAll();

      return this.success(res, stats, { message: 'Embedding process completed' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/rag/stats
   * Get embedding statistics
   */
  async getStats(req, res, next) {
    try {
      const stats = await embeddingService.getStats();
      return this.success(res, stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/rag/embeddings/:sourceType/:sourceId
   * Delete embeddings for a specific source
   */
  async deleteEmbeddings(req, res, next) {
    try {
      const { sourceType, sourceId } = req.params;

      if (!['transcription', 'enrichment'].includes(sourceType)) {
        throw new ApiError(400, 'Invalid source type. Must be "transcription" or "enrichment"');
      }

      const deleted = await embeddingModel.deleteBySource(sourceType, sourceId);

      return this.success(res, {
        sourceType,
        sourceId,
        deletedCount: deleted,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Format search results for response
   * @param {Array} results - Raw search results
   * @returns {Array} - Formatted results
   */
  formatSearchResults(results) {
    return results.map(r => ({
      content: r.content,
      similarity: r.similarity,
      sourceType: r.source_type,
      sourceId: r.source_id,
      transcriptionId: r.transcription_id,
      recordingId: r.recording_id,
      recordingFilename: r.recording_filename,
      recordingDate: r.recording_created_at,
    }));
  }

  /**
   * Format similar results for response
   * @param {Array} results - Raw similar results
   * @returns {Array} - Formatted results
   */
  formatSimilarResults(results) {
    return results.map(r => ({
      content: r.content.substring(0, 300) + (r.content.length > 300 ? '...' : ''),
      similarity: r.similarity,
      transcriptionId: r.transcription_id,
      recordingId: r.recording_id,
      recordingFilename: r.recording_filename,
      recordingDate: r.recording_created_at,
    }));
  }
}

module.exports = new RAGController();
