/**
 * Middleware Index
 * Export all middleware modules
 */

const {
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
  ERROR_CODES,
} = require('./error.middleware');

const {
  validateUUID,
  validateBody,
  validateQuery,
  sanitizeBody,
} = require('./validation.middleware');

module.exports = {
  // Error handling
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
  ERROR_CODES,
  
  // Validation
  validateUUID,
  validateBody,
  validateQuery,
  sanitizeBody,
};
