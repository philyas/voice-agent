/**
 * RAG Routes
 * API routes for Retrieval-Augmented Generation
 */

const express = require('express');
const ragController = require('../controllers/rag.controller');

const router = express.Router();

/**
 * POST /api/v1/rag/chat
 * Chat with your recordings using RAG
 * Body: { question: string, history?: Array<{role, content}>, options?: { topK, minSimilarity, language } }
 */
router.post('/chat', ragController.chat.bind(ragController));

/**
 * POST /api/v1/rag/search
 * Semantic search over embeddings
 * Body: { query: string, limit?: number, minSimilarity?: number }
 */
router.post('/search', ragController.search.bind(ragController));

/**
 * GET /api/v1/rag/similar/:transcriptionId
 * Find recordings similar to a specific transcription
 * Query: { limit?: number }
 */
router.get('/similar/:transcriptionId', ragController.findSimilar.bind(ragController));

/**
 * POST /api/v1/rag/embed-all
 * Embed all existing transcriptions and enrichments (initial setup)
 */
router.post('/embed-all', ragController.embedAll.bind(ragController));

/**
 * GET /api/v1/rag/stats
 * Get embedding statistics
 */
router.get('/stats', ragController.getStats.bind(ragController));

/**
 * DELETE /api/v1/rag/embeddings/:sourceType/:sourceId
 * Delete embeddings for a specific source
 */
router.delete('/embeddings/:sourceType/:sourceId', ragController.deleteEmbeddings.bind(ragController));

module.exports = router;
