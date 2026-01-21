/**
 * Enrichment Model
 * Database operations for AI-enriched content
 */

const BaseModel = require('./base.model');

class EnrichmentModel extends BaseModel {
  constructor() {
    super('enrichments');
  }

  /**
   * Enrichment types enum
   */
  static TYPES = {
    SUMMARY: 'summary',
    FORMATTED: 'formatted',
    NOTES: 'notes',
    ACTION_ITEMS: 'action_items',
    KEY_POINTS: 'key_points',
    TRANSLATION: 'translation',
    CUSTOM: 'custom',
  };

  /**
   * Create a new enrichment
   * @param {Object} data - Enrichment data
   * @returns {Promise<Object>}
   */
  async createEnrichment(data) {
    return this.create({
      transcription_id: data.transcriptionId,
      type: data.type,
      content: data.content,
      prompt_used: data.promptUsed || null,
      model_used: data.modelUsed || 'gpt-4o-mini',
      tokens_used: data.tokensUsed || null,
    });
  }

  /**
   * Find enrichments by transcription ID
   * @param {string} transcriptionId - Transcription UUID
   * @returns {Promise<Array>}
   */
  async findByTranscriptionId(transcriptionId) {
    return this.findWhere({ transcription_id: transcriptionId });
  }

  /**
   * Find enrichment by transcription ID and type
   * @param {string} transcriptionId - Transcription UUID
   * @param {string} type - Enrichment type
   * @returns {Promise<Object|null>}
   */
  async findByTranscriptionAndType(transcriptionId, type) {
    return this.findOneWhere({
      transcription_id: transcriptionId,
      type,
    });
  }

  /**
   * Get all enrichments with transcription info
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async findAllWithTranscriptions(options = {}) {
    const { limit = 50, offset = 0, type } = options;
    
    let query = this.db(this.tableName)
      .select(
        'enrichments.*',
        'transcriptions.text as transcription_text'
      )
      .leftJoin('transcriptions', 'enrichments.transcription_id', 'transcriptions.id')
      .orderBy('enrichments.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    if (type) {
      query = query.where('enrichments.type', type);
    }

    return query;
  }

  /**
   * Delete all enrichments for a transcription
   * @param {string} transcriptionId - Transcription UUID
   * @returns {Promise<number>} - Number of deleted records
   */
  async deleteByTranscriptionId(transcriptionId) {
    return this.db(this.tableName)
      .where({ transcription_id: transcriptionId })
      .del();
  }

  /**
   * Get enrichment statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    const stats = await this.db(this.tableName)
      .select('type')
      .count('* as count')
      .sum('tokens_used as total_tokens')
      .groupBy('type');

    return stats.reduce((acc, row) => {
      acc[row.type] = {
        count: parseInt(row.count, 10),
        totalTokens: parseInt(row.total_tokens, 10) || 0,
      };
      return acc;
    }, {});
  }
}

module.exports = new EnrichmentModel();
