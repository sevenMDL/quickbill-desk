/**
 * Health Check Routes - Handles system health monitoring and status checks
 * @module routes/healthRoutes
 * @requires express
 * @requires ../middleware/auth
 * @requires ../middleware/validation
 * @requires ../validation/schemas
 * @requires ../controllers/healthController
 */

const express = require('express');
const { auth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { healthSchemas } = require('../validation/schemas');
const HealthController = require('../controllers/healthController');
const { rateLimit } = require('express-rate-limit');

const router = express.Router();

// Rate limiting for health endpoints
const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    message: 'Too many health check requests'
  }
});

const strictHealthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute for admin endpoints
  message: {
    success: false,
    message: 'Too many health check requests'
  }
});

// Public health check with rate limiting
router.get('/', healthLimiter, validateRequest(healthSchemas.getHealth), HealthController.getHealth);

// Admin-only health endpoints with stricter rate limiting
router.get('/refresh', auth, strictHealthLimiter, validateRequest(healthSchemas.refreshHealthData), HealthController.refreshHealthData);

/**
 * Get detailed system information (admin only)
 * @param {string} [include] - Comma-separated list of components to include
 * @param {string} [format] - Output format: 'json' or 'minimal'
 */
router.get('/detailed', auth, strictHealthLimiter, validateRequest(healthSchemas.getDetailedHealth), (req, res) => {
  const { include = ['all'], format = 'json' } = req.query;
  
  const healthData = {
    success: true,
    data: {}
  };

  // Include process info if requested
  if (include.includes('all') || include.includes('process')) {
    healthData.data.process = {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      version: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  // Include environment info if requested
  if (include.includes('all') || include.includes('environment')) {
    healthData.data.environment = {
      node_env: process.env.NODE_ENV,
      port: process.env.PORT,
      admin_user: process.env.ADMIN_USERNAME ? 'set' : 'not set'
    };
  }

  // Include system info if requested
  if (include.includes('all') || include.includes('system')) {
    healthData.data.system = {
      versions: process.versions,
      cwd: process.cwd(),
      title: process.title,
      argv: process.argv
    };
  }

  // Minimal format for reduced payload
  if (format === 'minimal') {
    healthData.data = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB'
    };
  }

  res.status(200).json(healthData);
});

module.exports = router;
