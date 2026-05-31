/**
 * Request Logging Middleware - Comprehensive request and response logging
 * @module middleware/requestLogger
 * @requires ../utils/logger
 */

const logger = require('../utils/logger');

/**
 * Logs all incoming requests with relevant details for monitoring and debugging
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Skip health checks in production to reduce log noise
  if (process.env.NODE_ENV === 'production' && req.path === '/api/health') {
    return next();
  }

  // Log request details
  const requestLog = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    user: req.user ? req.user.username : 'anonymous'
  };

  // Include detailed request data only in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    requestLog.query = req.query;
    if (req.body && Object.keys(req.body).length > 0) {
      // Mask sensitive fields in request body
      const maskedBody = { ...req.body };
      const sensitiveFields = ['password', 'token', 'secret', 'authorization'];
      
      sensitiveFields.forEach(field => {
        if (maskedBody[field]) {
          maskedBody[field] = '***MASKED***';
        }
      });
      
      requestLog.body = maskedBody;
    }
  }

  logger.debug('Incoming request', requestLog);

  // Capture response details when request completes
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    const responseLog = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip || req.connection.remoteAddress,
      user: req.user ? req.user.username : 'anonymous',
      contentLength: res.get('Content-Length')
    };

    // Log based on status code and environment
    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', responseLog);
    } else if (process.env.NODE_ENV !== 'production') {
      logger.debug('Request completed successfully', responseLog);
    } else {
      // In production, only log slow requests or errors
      if (responseTime > 1000) {
        logger.warn('Slow request detected', { ...responseLog, threshold: '1s' });
      }
    }

    originalSend.call(this, data);
  };

  next();
};

/**
 * Error logging middleware - catches and logs request errors
 */
const errorLogger = (err, req, res, next) => {
  const errorLog = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    user: req.user ? req.user.username : 'anonymous',
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode || 500
  };

  logger.error('Request error occurred', errorLog);
  next(err);
};

module.exports = {
  requestLogger,
  errorLogger
};
