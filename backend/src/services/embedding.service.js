/**
 * Embedding Service
 * Handles vector embeddings using OpenAI Embeddings API
 */

const OpenAI = require('openai');
const { env } = require('../config/env');
const embeddingModel = require('../models/embedding.model');
const logger = require('../utils/logger.util');

// OpenAI embedding model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_TOKENS = 8191; // Max tokens for text-embedding-3-small
const CHUNK_SIZE = 1000; // Characters per chunk (conservative estimate)
const CHUNK_OVERLAP = 200; // Overlap between chunks for context continuity

class EmbeddingService {
  constructor() {
    this.client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Generate embedding for text using OpenAI API
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} - Embedding vector
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      const response = await this.client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text.trim(),
        dimensions: EMBEDDING_DIMENSIONS,
      });

      return response.data[0].embedding;
    } catch (error) {
      logger.error('OpenAI Embedding Error', error);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts (batch)
   * @param {Array<string>} texts - Array of texts to embed
   * @returns {Promise<Array<Array<number>>>} - Array of embedding vectors
   */
  async generateBatchEmbeddings(texts) {
    if (!texts || texts.length === 0) {
      return [];
    }

    const validTexts = texts.filter(t => t && t.trim().length > 0);
    
    if (validTexts.length === 0) {
      return [];
    }

    try {
      const response = await this.client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: validTexts.map(t => t.trim()),
        dimensions: EMBEDDING_DIMENSIONS,
      });

      return response.data.map(d => d.embedding);
    } catch (error) {
      logger.error('OpenAI Batch Embedding Error', error);
      throw new Error(`Batch embedding generation failed: ${error.message}`);
    }
  }

  /**
   * Split text into chunks for long documents
   * @param {string} text - Text to split
   * @returns {Array<string>} - Array of text chunks
   */
  splitIntoChunks(text) {
    if (!text || text.length <= CHUNK_SIZE) {
      return [text];
    }

    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      let endIndex = startIndex + CHUNK_SIZE;

      // Try to break at sentence boundary
      if (endIndex < text.length) {
        const sentenceEnd = text.lastIndexOf('.', endIndex);
        const questionEnd = text.lastIndexOf('?', endIndex);
        const exclamationEnd = text.lastIndexOf('!', endIndex);
        
        const bestBreak = Math.max(sentenceEnd, questionEnd, exclamationEnd);
        
        if (bestBreak > startIndex + CHUNK_SIZE / 2) {
          endIndex = bestBreak + 1;
        }
      }

      chunks.push(text.slice(startIndex, endIndex).trim());
      startIndex = endIndex - CHUNK_OVERLAP;
    }

    return chunks.filter(chunk => chunk.length > 0);
  }

  /**
   * Embed and store content for a source
   * @param {string} sourceType - 'transcription' or 'enrichment'
   * @param {string} sourceId - Source UUID
   * @param {string} content - Content to embed
   * @returns {Promise<Array<Object>>} - Created embedding records
   */
  async embedAndStore(sourceType, sourceId, content) {
    if (!content || content.trim().length === 0) {
      logger.warn(`Empty content for ${sourceType}:${sourceId}, skipping embedding`);
      return [];
    }

    // Delete existing embeddings for this source (re-embedding)
    await embeddingModel.deleteBySource(sourceType, sourceId);

    // Split content into chunks
    const chunks = this.splitIntoChunks(content);
    const totalChunks = chunks.length;

    // Generate embeddings for all chunks
    const embeddings = await this.generateBatchEmbeddings(chunks);

    // Store embeddings
    const results = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embeddingModel.createEmbedding({
        sourceType,
        sourceId,
        content: chunks[i],
        embedding: embeddings[i],
        chunkIndex: i,
        totalChunks,
        model: EMBEDDING_MODEL,
        dimensions: EMBEDDING_DIMENSIONS,
      });
      results.push(embedding);
    }

    logger.debug(`Created ${results.length} embeddings for ${sourceType}:${sourceId}`);
    return results;
  }

  /**
   * Embed a transcription
   * @param {string} transcriptionId - Transcription UUID
   * @param {string} text - Transcription text
   * @returns {Promise<Array<Object>>}
   */
  async embedTranscription(transcriptionId, text) {
    return this.embedAndStore('transcription', transcriptionId, text);
  }

  /**
   * Embed an enrichment
   * @param {string} enrichmentId - Enrichment UUID
   * @param {string} content - Enrichment content
   * @returns {Promise<Array<Object>>}
   */
  async embedEnrichment(enrichmentId, content) {
    return this.embedAndStore('enrichment', enrichmentId, content);
  }

  /**
   * Perform semantic search
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array<Object>>}
   */
  async search(query, options = {}) {
    const queryEmbedding = await this.generateEmbedding(query);
    return embeddingModel.semanticSearch(queryEmbedding, options);
  }

  /**
   * Check if embeddings exist for a source
   * @param {string} sourceType - 'transcription' or 'enrichment'
   * @param {string} sourceId - Source UUID
   * @returns {Promise<boolean>}
   */
  async hasEmbeddings(sourceType, sourceId) {
    return embeddingModel.hasEmbeddings(sourceType, sourceId);
  }

  /**
   * Get embedding statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    return embeddingModel.getStats();
  }

  /**
   * Check if service is configured
   * @returns {boolean}
   */
  isConfigured() {
    return !!env.OPENAI_API_KEY;
  }
}

module.exports = new EmbeddingService();
