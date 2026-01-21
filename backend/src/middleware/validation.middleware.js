/**
 * Validation Middleware
 * Request validation utilities
 */

const { ApiError } = require('./error.middleware');

/**
 * Validate UUID format
 * @param {string} paramName - Name of the parameter to validate
 */
const validateUUID = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!uuidRegex.test(value)) {
      return next(new ApiError(400, `Invalid ${paramName} format. Must be a valid UUID.`));
    }
    
    next();
  };
};

/**
 * Validate request body fields
 * @param {Object} schema - Validation schema
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];
      
      // Check required
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push({ field, message: `${field} is required` });
        continue;
      }
      
      // Skip further validation if field is not present and not required
      if (value === undefined || value === null) continue;
      
      // Check type
      if (rules.type && typeof value !== rules.type) {
        errors.push({ field, message: `${field} must be a ${rules.type}` });
      }
      
      // Check enum values
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({ field, message: `${field} must be one of: ${rules.enum.join(', ')}` });
      }
      
      // Check min length
      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        errors.push({ field, message: `${field} must be at least ${rules.minLength} characters` });
      }
      
      // Check max length
      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push({ field, message: `${field} must not exceed ${rules.maxLength} characters` });
      }
      
      // Check min value
      if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        errors.push({ field, message: `${field} must be at least ${rules.min}` });
      }
      
      // Check max value
      if (rules.max !== undefined && typeof value === 'number' && value > rules.max) {
        errors.push({ field, message: `${field} must not exceed ${rules.max}` });
      }
    }
    
    if (errors.length > 0) {
      return next(new ApiError(422, 'Validation failed', errors));
    }
    
    next();
  };
};

/**
 * Validate query parameters
 * @param {Object} schema - Validation schema
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const errors = [];
    
    for (const [param, rules] of Object.entries(schema)) {
      let value = req.query[param];
      
      // Skip if not present and not required
      if (value === undefined && !rules.required) continue;
      
      // Check required
      if (rules.required && value === undefined) {
        errors.push({ param, message: `Query parameter ${param} is required` });
        continue;
      }
      
      // Parse numeric values
      if (rules.type === 'number' && value !== undefined) {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed)) {
          errors.push({ param, message: `${param} must be a number` });
          continue;
        }
        req.query[param] = parsed;
        value = parsed;
      }
      
      // Check min value
      if (rules.min !== undefined && value < rules.min) {
        errors.push({ param, message: `${param} must be at least ${rules.min}` });
      }
      
      // Check max value
      if (rules.max !== undefined && value > rules.max) {
        errors.push({ param, message: `${param} must not exceed ${rules.max}` });
      }
    }
    
    if (errors.length > 0) {
      return next(new ApiError(400, 'Invalid query parameters', errors));
    }
    
    next();
  };
};

/**
 * Sanitize string inputs
 * @param {Array<string>} fields - Fields to sanitize
 */
const sanitizeBody = (fields) => {
  return (req, res, next) => {
    for (const field of fields) {
      if (typeof req.body[field] === 'string') {
        req.body[field] = req.body[field].trim();
      }
    }
    next();
  };
};

module.exports = {
  validateUUID,
  validateBody,
  validateQuery,
  sanitizeBody,
};
