/**
 * Error Middleware
 * Global error handling for the API
 */

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error codes mapping
 */
const ERROR_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'File too large. Maximum size is 25MB.';
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Unexpected file field';
  }

  // Handle database errors
  if (err.code === '23505') {
    statusCode = 409;
    message = 'Duplicate entry';
  }

  if (err.code === '23503') {
    statusCode = 400;
    message = 'Foreign key constraint violation';
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    details = err.errors;
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      statusCode,
      message,
      stack: err.stack,
      details,
    });
  } else {
    // Log minimal info in production
    console.error(`[${new Date().toISOString()}] ${statusCode}: ${message}`);
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code: ERROR_CODES[statusCode] || 'UNKNOWN_ERROR',
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  ApiError,
  notFoundHandler,
  errorHandler,
  asyncHandler,
  ERROR_CODES,
};
