/**
 * Rate Limiting Middleware
 * Protects endpoints from being overloaded by requests (bots, DDoS, etc.)
 */

const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

/**
 * Rate Limit Mode Configuration
 * 'ip' = Per IP address (default) - each IP gets its own limit
 * 'global' = Global limit for all users - all IPs share the same limit
 */
const RATE_LIMIT_MODE = env.RATE_LIMIT_MODE || 'ip'; // 'ip' or 'global'

/**
 * Standard API rate limiter
 * General protection for all API endpoints
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes (900000ms)
  max: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '20', 10), // Limit each IP to 20 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Use IP address as key (or 'global' for shared limit)
  keyGenerator: (req) => {
    if (RATE_LIMIT_MODE === 'global') {
      return 'global'; // All requests share the same limit
    }
    // Per IP: Check for forwarded IP (when behind proxy/load balancer)
    return req.ip || 
           req.connection.remoteAddress || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.socket.remoteAddress || 
           'unknown';
  },
  // Custom handler for rate limit exceeded
  handler: (req, res) => {
    const message = RATE_LIMIT_MODE === 'global' 
      ? 'Too many requests globally, please try again later.'
      : 'Too many requests from this IP, please try again later.';
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000), // seconds until reset
      },
      timestamp: new Date().toISOString(),
    });
  },
  // Skip rate limiting for certain conditions (optional)
  skip: (req) => {
    // Skip for health checks
    if (req.path === '/health') return true;
    return false;
  },
});

/**
 * Strict rate limiter for heavy operations
 * Used for transcription, enrichment, RAG operations
 */
const strictLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_STRICT_WINDOW_MS || '3600000', 10), // 1 hour (3600000ms)
  max: parseInt(env.RATE_LIMIT_STRICT_MAX_REQUESTS || '5', 10), // Limit each IP to 5 requests per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests for this resource type, please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (RATE_LIMIT_MODE === 'global') return 'global';
    return req.ip || 
           req.connection.remoteAddress || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.socket.remoteAddress || 
           'unknown';
  },
  handler: (req, res) => {
    const message = RATE_LIMIT_MODE === 'global'
      ? 'Too many requests globally for this resource type, please try again later.'
      : 'Too many requests for this resource type, please try again later.';
    
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * File upload rate limiter
 * Stricter limits for file uploads to prevent abuse
 */
const uploadLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_UPLOAD_WINDOW_MS || '3600000', 10), // 1 hour (3600000ms)
  max: parseInt(env.RATE_LIMIT_UPLOAD_MAX_REQUESTS || '3', 10), // Limit each IP to 3 uploads per hour
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many file uploads from this IP, please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 
           req.connection.remoteAddress || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.socket.remoteAddress || 
           'unknown';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many file uploads from this IP, please try again later.',
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * RAG/Chat rate limiter
 * Limits for AI-powered chat and search operations
 */
const ragLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_RAG_WINDOW_MS || '900000', 10), // 15 minutes (900000ms)
  max: parseInt(env.RATE_LIMIT_RAG_MAX_REQUESTS || '10', 10), // Limit each IP to 10 requests per 15 minutes
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many chat/search requests, please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 
           req.connection.remoteAddress || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.socket.remoteAddress || 
           'unknown';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many chat/search requests, please try again later.',
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
      },
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Lenient rate limiter for read-only operations
 * Used for GET requests that don't modify data
 */
const readLimiter = rateLimit({
  windowMs: parseInt(env.RATE_LIMIT_READ_WINDOW_MS || '900000', 10), // 15 minutes (900000ms)
  max: parseInt(env.RATE_LIMIT_READ_MAX_REQUESTS || '50', 10), // Limit each IP to 50 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many read requests from this IP, please try again later.',
    },
    timestamp: new Date().toISOString(),
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || 
           req.connection.remoteAddress || 
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.socket.remoteAddress || 
           'unknown';
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many read requests from this IP, please try again later.',
        retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
      },
      timestamp: new Date().toISOString(),
    });
  },
});

module.exports = {
  apiLimiter,
  strictLimiter,
  uploadLimiter,
  ragLimiter,
  readLimiter,
};
