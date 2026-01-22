/**
 * Response Utility
 * Standardized API response formatting
 */

/**
 * Create a success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {Object} options - Additional options
 * @param {string} options.message - Success message
 * @param {Object} options.meta - Metadata (pagination, etc.)
 * @param {number} options.statusCode - HTTP status code (default: 200)
 */
function successResponse(res, data, options = {}) {
  const { message, meta, statusCode = 200 } = options;

  const response = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

/**
 * Create a paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination info
 * @param {number} pagination.limit - Items per page
 * @param {number} pagination.offset - Offset
 * @param {number} pagination.total - Total count (optional)
 * @param {string} message - Success message (optional)
 */
function paginatedResponse(res, data, pagination, message = null) {
  return successResponse(res, data, {
    message,
    meta: {
      limit: pagination.limit,
      offset: pagination.offset,
      count: data.length,
      ...(pagination.total !== undefined && { total: pagination.total }),
    },
  });
}

/**
 * Create a created response (201)
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 */
function createdResponse(res, data, message = 'Resource created successfully') {
  return successResponse(res, data, { message, statusCode: 201 });
}

/**
 * Create a no content response (204)
 * @param {Object} res - Express response object
 */
function noContentResponse(res) {
  return res.status(204).send();
}

module.exports = {
  successResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
};
