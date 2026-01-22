/**
 * Pagination Utility
 * Helper functions for pagination handling
 */

const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;
const MAX_LIMIT = 100;

/**
 * Parse and validate pagination parameters from query
 * @param {Object} query - Express request query object
 * @param {Object} options - Options
 * @param {number} options.defaultLimit - Default limit (default: 50)
 * @param {number} options.maxLimit - Maximum limit (default: 100)
 * @returns {Object} - Parsed pagination { limit, offset }
 */
function parsePagination(query, options = {}) {
  const {
    defaultLimit = DEFAULT_LIMIT,
    maxLimit = MAX_LIMIT,
  } = options;

  const limit = Math.min(
    Math.max(parseInt(query.limit, 10) || defaultLimit, 1),
    maxLimit
  );
  const offset = Math.max(parseInt(query.offset, 10) || DEFAULT_OFFSET, 0);

  return { limit, offset };
}

/**
 * Calculate pagination metadata
 * @param {number} total - Total number of items
 * @param {number} limit - Items per page
 * @param {number} offset - Current offset
 * @returns {Object} - Pagination metadata
 */
function getPaginationMeta(total, limit, offset) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasNext = offset + limit < total;
  const hasPrevious = offset > 0;

  return {
    limit,
    offset,
    total,
    count: Math.min(limit, total - offset),
    currentPage,
    totalPages,
    hasNext,
    hasPrevious,
  };
}

module.exports = {
  parsePagination,
  getPaginationMeta,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
  MAX_LIMIT,
};
