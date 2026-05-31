/**
 * Rate Limiting Middleware - Protects against brute force and DDoS attacks
 * @module middleware/rateLimit
 * @requires express-rate-limit
 * @requires ../config
 * @requires ../utils/logger
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Creates a rate limiter with specified window and maximum requests
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum number of requests per window
 * @param {string} message - Error message when limit exceeded
 * @returns {Object} Configured rate limiter middleware
 */
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
      res.status(429).json({
        success: false,
        message
      });
    }
  });
};

// General API rate limiter for all endpoints
const apiLimiter = createRateLimiter(
  config.rateLimit.windowMs,
  config.rateLimit.max,
  'Too many requests from this IP, please try again later.'
);

// Stricter rate limiter specifically for authentication endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  15, // 15 attempts per 15 minutes
  'Too many authentication attempts, please try again later.'
);

module.exports = { apiLimiter, authLimiter };
