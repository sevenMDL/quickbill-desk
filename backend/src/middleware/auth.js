/**
 * Authentication Middleware - Handles JWT token validation and user authentication
 * @module middleware/auth
 * @requires jsonwebtoken
 * @requires ../config
 * @requires ../utils/logger
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Main authentication middleware - validates JWT tokens and sets user context
 */
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn('Access attempt without token', { ip: req.ip, path: req.path });
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Validate token payload structure
    if (!decoded.username || decoded.username !== process.env.ADMIN_USERNAME) {
      logger.warn('Invalid token payload', { ip: req.ip });
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    req.user = decoded;
    logger.debug('Token validated successfully', { username: decoded.username, path: req.path });
    next();
  } catch (error) {
    logger.error('Authentication error:', { error: error.message, ip: req.ip });
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Optional authentication middleware - sets user context if valid token present
 * Continues without authentication if token is invalid or missing
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret);
      if (decoded.username === process.env.ADMIN_USERNAME) {
        req.user = decoded;
        logger.debug('Optional auth - token validated', { username: decoded.username });
      }
    }
    next();
  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
};

module.exports = { auth, optionalAuth };
