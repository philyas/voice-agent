/**
 * Base Controller
 * Provides common controller functionality and response helpers
 */

const { ApiError } = require('../middleware/error.middleware');
const { successResponse, paginatedResponse, createdResponse } = require('../utils/response.util');
const { parsePagination } = require('../utils/pagination.util');

class BaseController {
  /**
   * Handle async controller methods with error handling
   * @param {Function} fn - Async controller function
   * @returns {Function} - Express middleware function
   */
  asyncHandler(fn) {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Parse pagination from query parameters
   * @param {Object} query - Request query object
   * @returns {Object} - { limit, offset }
   */
  parsePagination(query) {
    return parsePagination(query);
  }

  /**
   * Send success response
   * @param {Object} res - Express response
   * @param {*} data - Response data
   * @param {Object} options - Response options
   */
  success(res, data, options = {}) {
    return successResponse(res, data, options);
  }

  /**
   * Send paginated response
   * @param {Object} res - Express response
   * @param {Array} data - Response data
   * @param {Object} pagination - Pagination info
   * @param {string} message - Optional message
   */
  paginated(res, data, pagination, message = null) {
    return paginatedResponse(res, data, pagination, message);
  }

  /**
   * Send created response (201)
   * @param {Object} res - Express response
   * @param {*} data - Response data
   * @param {string} message - Success message
   */
  created(res, data, message = 'Resource created successfully') {
    return createdResponse(res, data, message);
  }

  /**
   * Validate required fields in request body
   * @param {Object} body - Request body
   * @param {Array<string>} fields - Required field names
   * @throws {ApiError} - If validation fails
   */
  validateRequired(body, fields) {
    const missing = fields.filter(field => body[field] === undefined || body[field] === null);
    
    if (missing.length > 0) {
      throw new ApiError(400, `Missing required fields: ${missing.join(', ')}`);
    }
  }

  /**
   * Validate field type
   * @param {Object} body - Request body
   * @param {string} field - Field name
   * @param {string} type - Expected type ('string', 'number', 'boolean', etc.)
   * @throws {ApiError} - If validation fails
   */
  validateType(body, field, type) {
    if (body[field] !== undefined && typeof body[field] !== type) {
      throw new ApiError(400, `Field '${field}' must be of type ${type}`);
    }
  }

  /**
   * Get entity or throw 404
   * @param {Object|null} entity - Entity from database
   * @param {string} entityName - Name of entity for error message
   * @returns {Object} - Entity
   * @throws {ApiError} - If entity not found
   */
  getEntityOr404(entity, entityName = 'Resource') {
    if (!entity) {
      throw new ApiError(404, `${entityName} not found`);
    }
    return entity;
  }
}

module.exports = BaseController;
