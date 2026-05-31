/**
 * Global Error Handler - Centralized error handling middleware
 * @module middleware/errorHandler
 * @requires ../config
 * @requires ../utils/logger
 */

const config = require('../config');
const logger = require('../utils/logger');

/**
 * Global error handling middleware - processes all errors and returns consistent responses
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error with contextual information
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.username : 'anonymous'
  });

  // Handle specific error types with appropriate status codes and messages

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Rate limit error
  if (err.statusCode === 429) {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  // Database connection errors
  if (err.code === 'ECONNREFUSED') {
    const message = 'Database connection refused';
    error = { message, statusCode: 503 };
  }

  // External service errors
  if (err.code === 'ENOTFOUND') {
    const message = 'External service unavailable';
    error = { message, statusCode: 502 };
  }

  // File system errors
  if (err.code === 'ENOENT') {
    const message = 'File or directory not found';
    error = { message, statusCode: 404 };
  }

  // Permission errors
  if (err.code === 'EACCES' || err.code === 'EPERM') {
    const message = 'Permission denied';
    error = { message, statusCode: 403 };
  }

  // Payload too large
  if (err.type === 'entity.too.large') {
    const message = 'Request payload too large';
    error = { message, statusCode: 413 };
  }

  // Timeout errors
  if (err.code === 'ETIMEDOUT') {
    const message = 'Request timeout';
    error = { message, statusCode: 408 };
  }

  const response = {
    success: false,
    message: error.message || 'Internal Server Error'
  };

  // Include stack trace and debug info in development only
  if (config.env === 'development') {
    response.stack = err.stack;
    response.debug = {
      error_type: err.name,
      error_code: err.code,
      path: req.path,
      method: req.method
    };
  }

  // Include recovery information in production for specific errors
  if (config.env === 'production') {
    if (err.statusCode === 429) {
      response.retry_after = '15 minutes';
    }
    
    if (err.statusCode === 503) {
      response.recovery_action = 'Please try again later';
    }
  }

  res.status(error.statusCode || 500).json(response);
};

module.exports = errorHandler;
