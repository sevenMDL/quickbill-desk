/**
 * Security Middleware - Applies security headers and CORS configuration
 * @module middleware/security
 * @requires helmet
 * @requires cors
 * @requires ../config
 */

const helmet = require('helmet');
const cors = require('cors');
const config = require('../config');

/**
 * Array of security middleware functions to be applied to Express app
 */
const securityMiddleware = [
  // Helmet for comprehensive security headers
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production' ? true : false
  }),

  // CORS configuration for cross-origin requests
  cors({
    origin: config.env === 'production'
      ? config.cors.origins
      : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080', /\.app\.github\.dev$/],
    credentials: true,
  }),
];

module.exports = securityMiddleware;
