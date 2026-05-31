const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Authentication Controller - Handles user authentication and token management
 * @module controllers/authController
 * @requires jsonwebtoken
 * @requires ../config
 * @requires ../utils/logger
 */
class AuthController {
  /**
   * Authenticate user and generate JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with authentication result
   */
  static async login(req, res) {
    try {
      const { username, password } = req.body;

      // Validate credentials against environment variables
      if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
        logger.warn('Failed login attempt', { username, ip: req.ip });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Generate JWT token with user claims
      const token = jwt.sign(
        { 
          username: username,
          role: 'admin',
          timestamp: Date.now()
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      logger.info('Successful admin login', { username, ip: req.ip });
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        expiresIn: config.jwt.expiresIn,
        user: { username, role: 'admin' }
      });

    } catch (error) {
      logger.error('Login controller error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  /**
   * Handle user logout (client-side token disposal)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response confirming logout
   */
  static logout(req, res) {
    logger.info('Admin logout', { username: req.user?.username });
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  }

  /**
   * Validate JWT token and return user information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @returns {Object} JSON response with user data
   */
  static validateToken(req, res) {
    res.status(200).json({
      success: true,
      user: {
        username: req.user.username,
        role: req.user.role
      }
    });
  }
}

module.exports = AuthController;
