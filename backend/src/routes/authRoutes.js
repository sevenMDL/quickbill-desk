/**
 * Authentication Routes - Handles user authentication and token management
 * @module routes/authRoutes
 * @requires express
 * @requires ../middleware/auth
 * @requires ../middleware/rateLimit
 * @requires ../middleware/validation
 * @requires ../validation/schemas
 * @requires ../controllers/authController
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { validateRequest } = require('../middleware/validation');
const { authSchemas } = require('../validation/schemas');
const {
  login,
  logout,
  validateToken
} = require('../controllers/authController');

const router = express.Router();

// Apply stricter rate limiting to auth routes
router.use(authLimiter);

// Public routes
router.post('/login', validateRequest(authSchemas.login), login);

// Protected routes
router.post('/logout', auth, validateRequest(authSchemas.validateToken), logout);
router.get('/validate', auth, validateRequest(authSchemas.validateToken), validateToken);

module.exports = router;
