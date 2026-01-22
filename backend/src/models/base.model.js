/**
 * Base Model
 * Abstract base class for all database models
 * Provides common CRUD operations using Knex
 */

const db = require('../config/database');
const { parsePagination } = require('../utils/pagination.util');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.db = db;
  }

  /**
   * Get all records
   * @param {Object} options - Query options
   * @param {string} options.orderBy - Column to order by (default: 'created_at')
   * @param {string} options.order - Order direction (default: 'desc')
   * @param {number} options.limit - Limit (will be parsed from query if needed)
   * @param {number} options.offset - Offset (will be parsed from query if needed)
   * @returns {Promise<Array>}
   */
  async findAll(options = {}) {
    const { orderBy = 'created_at', order = 'desc' } = options;
    
    // Parse pagination if limit/offset are provided as strings (from query params)
    const pagination = parsePagination(options);
    
    let query = this.db(this.tableName).orderBy(orderBy, order);
    
    if (pagination.limit) query = query.limit(pagination.limit);
    if (pagination.offset) query = query.offset(pagination.offset);
    
    return query;
  }

  /**
   * Find record by ID
   * @param {string} id - Record UUID
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const result = await this.db(this.tableName).where({ id }).first();
    return result || null;
  }

  /**
   * Find records by condition
   * @param {Object} conditions - Where conditions
   * @returns {Promise<Array>}
   */
  async findWhere(conditions) {
    return this.db(this.tableName).where(conditions);
  }

  /**
   * Find single record by condition
   * @param {Object} conditions - Where conditions
   * @returns {Promise<Object|null>}
   */
  async findOneWhere(conditions) {
    const result = await this.db(this.tableName).where(conditions).first();
    return result || null;
  }

  /**
   * Create new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const [result] = await this.db(this.tableName)
      .insert(data)
      .returning('*');
    return result;
  }

  /**
   * Update record by ID
   * @param {string} id - Record UUID
   * @param {Object} data - Update data
   * @returns {Promise<Object|null>}
   */
  async update(id, data) {
    const [result] = await this.db(this.tableName)
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return result || null;
  }

  /**
   * Delete record by ID
   * @param {string} id - Record UUID
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const deleted = await this.db(this.tableName).where({ id }).del();
    return deleted > 0;
  }

  /**
   * Count records
   * @param {Object} conditions - Optional where conditions
   * @returns {Promise<number>}
   */
  async count(conditions = {}) {
    const [{ count }] = await this.db(this.tableName)
      .where(conditions)
      .count('* as count');
    return parseInt(count, 10);
  }

  /**
   * Check if record exists
   * @param {Object} conditions - Where conditions
   * @returns {Promise<boolean>}
   */
  async exists(conditions) {
    const result = await this.db(this.tableName).where(conditions).first();
    return !!result;
  }
}

module.exports = BaseModel;
