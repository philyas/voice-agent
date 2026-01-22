/**
 * RAG Controller
 * Handles RAG-related HTTP requests
 */

const ragService = require('../services/rag.service');
const embeddingService = require('../services/embedding.service');

class RAGController {
  /**
   * POST /api/v1/rag/chat
   * Answer a question using RAG
   */
  async chat(req, res, next) {
    try {
      const { question, history = [], options = {} } = req.body;

      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Question is required',
          },
        });
      }

      if (!embeddingService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'OpenAI API is not configured',
          },
        });
      }

      const result = await ragService.chat(question, history, {
        topK: options.topK || 5,
        minSimilarity: options.minSimilarity || 0.0,
        language: options.language || 'de',
      });

      res.json({
        success: true,
        data: result,
      });
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

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Query is required',
          },
        });
      }

      if (!embeddingService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'OpenAI API is not configured',
          },
        });
      }

      const results = await embeddingService.search(query, {
        limit,
        minSimilarity,
      });

      res.json({
        success: true,
        data: {
          query,
          results: results.map(r => ({
            content: r.content,
            similarity: r.similarity,
            sourceType: r.source_type,
            sourceId: r.source_id,
            transcriptionId: r.transcription_id,
            recordingId: r.recording_id,
            recordingFilename: r.recording_filename,
            recordingDate: r.recording_created_at,
          })),
          count: results.length,
        },
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

      if (!embeddingService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'OpenAI API is not configured',
          },
        });
      }

      const results = await ragService.findSimilarRecordings(
        transcriptionId,
        parseInt(limit, 10)
      );

      res.json({
        success: true,
        data: {
          transcriptionId,
          similar: results.map(r => ({
            content: r.content.substring(0, 300) + (r.content.length > 300 ? '...' : ''),
            similarity: r.similarity,
            transcriptionId: r.transcription_id,
            recordingId: r.recording_id,
            recordingFilename: r.recording_filename,
            recordingDate: r.recording_created_at,
          })),
          count: results.length,
        },
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
      if (!embeddingService.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'OpenAI API is not configured',
          },
        });
      }

      const stats = await ragService.embedAll();

      res.json({
        success: true,
        data: stats,
        message: 'Embedding process completed',
      });
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

      res.json({
        success: true,
        data: stats,
      });
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
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid source type. Must be "transcription" or "enrichment"',
          },
        });
      }

      const embeddingModel = require('../models/embedding.model');
      const deleted = await embeddingModel.deleteBySource(sourceType, sourceId);

      res.json({
        success: true,
        data: {
          sourceType,
          sourceId,
          deletedCount: deleted,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new RAGController();
