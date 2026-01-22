/**
 * Embedding Model
 * Database operations for vector embeddings (RAG)
 */

const BaseModel = require('./base.model');

class EmbeddingModel extends BaseModel {
  constructor() {
    super('embeddings');
  }

  /**
   * Create a new embedding
   * @param {Object} data - Embedding data
   * @returns {Promise<Object>}
   */
  async createEmbedding(data) {
    const {
      sourceType,
      sourceId,
      content,
      embedding,
      chunkIndex = 0,
      totalChunks = 1,
      model = 'text-embedding-3-small',
      dimensions = 1536,
    } = data;

    // Use raw query because knex doesn't support vector type natively
    const [result] = await this.db.raw(
      `INSERT INTO embeddings 
        (source_type, source_id, content, embedding, chunk_index, total_chunks, model, dimensions)
       VALUES (?, ?, ?, ?::vector, ?, ?, ?, ?)
       RETURNING *`,
      [sourceType, sourceId, content, `[${embedding.join(',')}]`, chunkIndex, totalChunks, model, dimensions]
    ).then(res => res.rows);

    return result;
  }

  /**
   * Find embeddings by source
   * @param {string} sourceType - 'transcription' or 'enrichment'
   * @param {string} sourceId - Source UUID
   * @returns {Promise<Array>}
   */
  async findBySource(sourceType, sourceId) {
    return this.db(this.tableName)
      .where({ source_type: sourceType, source_id: sourceId })
      .orderBy('chunk_index', 'asc');
  }

  /**
   * Delete embeddings by source
   * @param {string} sourceType - 'transcription' or 'enrichment'
   * @param {string} sourceId - Source UUID
   * @returns {Promise<number>} - Number of deleted rows
   */
  async deleteBySource(sourceType, sourceId) {
    return this.db(this.tableName)
      .where({ source_type: sourceType, source_id: sourceId })
      .del();
  }

  /**
   * Semantic search using cosine similarity
   * @param {Array<number>} queryEmbedding - Query vector
   * @param {Object} options - Search options
   * @returns {Promise<Array>}
   */
  async semanticSearch(queryEmbedding, options = {}) {
    const {
      limit = 5,
      minSimilarity = 0.0, // Optional filter, but not used in WHERE clause
      sourceTypes = ['transcription', 'enrichment'],
    } = options;

    const vectorString = `[${queryEmbedding.join(',')}]`;

    // Use cosine distance operator (<=>)
    // Lower distance = higher similarity
    // Sort by distance ascending and take top-K results
    const results = await this.db.raw(
      `SELECT 
        e.*,
        1 - (e.embedding <=> ?::vector) as similarity,
        e.embedding <=> ?::vector as distance,
        t.id as transcription_id,
        t.text as transcription_text,
        t.language as transcription_language,
        r.id as recording_id,
        r.original_filename as recording_filename,
        r.created_at as recording_created_at
       FROM embeddings e
       LEFT JOIN transcriptions t ON (
         (e.source_type = 'transcription' AND e.source_id = t.id) OR
         (e.source_type = 'enrichment' AND EXISTS (
           SELECT 1 FROM enrichments en WHERE en.id = e.source_id AND en.transcription_id = t.id
         ))
       )
       LEFT JOIN recordings r ON t.recording_id = r.id
       WHERE e.source_type = ANY(?)
       ORDER BY e.embedding <=> ?::vector
       LIMIT ?`,
      [vectorString, vectorString, sourceTypes, vectorString, limit]
    );

    // Filter by minSimilarity after retrieval (optional)
    let filteredResults = results.rows;
    if (minSimilarity > 0) {
      filteredResults = results.rows.filter(r => r.similarity >= minSimilarity);
    }

    return filteredResults;
  }

  /**
   * Get all embeddings with source info for a specific transcription
   * @param {string} transcriptionId - Transcription UUID
   * @returns {Promise<Array>}
   */
  async findByTranscription(transcriptionId) {
    return this.db.raw(
      `SELECT e.*, 
        CASE 
          WHEN e.source_type = 'transcription' THEN 'transcription'
          ELSE en.type
        END as enrichment_type
       FROM embeddings e
       LEFT JOIN enrichments en ON e.source_type = 'enrichment' AND e.source_id = en.id
       WHERE (e.source_type = 'transcription' AND e.source_id = ?)
          OR (e.source_type = 'enrichment' AND en.transcription_id = ?)
       ORDER BY e.created_at`,
      [transcriptionId, transcriptionId]
    ).then(res => res.rows);
  }

  /**
   * Check if source already has embeddings
   * @param {string} sourceType - 'transcription' or 'enrichment'
   * @param {string} sourceId - Source UUID
   * @returns {Promise<boolean>}
   */
  async hasEmbeddings(sourceType, sourceId) {
    const result = await this.db(this.tableName)
      .where({ source_type: sourceType, source_id: sourceId })
      .first();
    return !!result;
  }

  /**
   * Get embedding statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    const stats = await this.db.raw(`
      SELECT 
        source_type,
        COUNT(*) as count,
        COUNT(DISTINCT source_id) as unique_sources
      FROM embeddings
      GROUP BY source_type
    `).then(res => res.rows);

    const total = await this.count();

    return {
      total,
      byType: stats.reduce((acc, row) => {
        acc[row.source_type] = {
          embeddings: parseInt(row.count),
          uniqueSources: parseInt(row.unique_sources),
        };
        return acc;
      }, {}),
    };
  }
}

module.exports = new EmbeddingModel();
