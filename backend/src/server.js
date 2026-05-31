/**
 * QuickBill Desk Backend Server
 * Main application entry point and server configuration
 * @module server
 * @requires express
 * @requires cors
 * @requires helmet
 * @requires ./config/database
 * @requires ./config
 * @requires ./utils/logger
 */

require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const connectDB = require('./config/database');
const config = require('./config');
const logger = require('./utils/logger');

// Import routes and middleware
const authRoutes = require('./routes/authRoutes');
const { auth } = require('./middleware/auth');
const securityMiddleware = require('./middleware/security');
const { apiLimiter, authLimiter } = require('./middleware/rateLimit');
const clientRoutes = require('./routes/clientRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const exportRoutes = require('./routes/exportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const emailRoutes = require('./routes/emailRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const bulkRoutes = require('./routes/bulkRoutes');
const healthRoutes = require('./routes/healthRoutes');
const backupRoutes = require('./routes/backupRoutes');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const AutoBackupService = require('./services/AutoBackupService');

/**
 * Validates required environment variables and configuration
 * Exits process with error code if critical production requirements are missing
 * @throws {Error} If production environment has insufficient configuration
 */
const validateEnvironment = () => {
  const requiredEnvVars = ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'JWT_SECRET'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missingEnvVars.length > 0) {
    logger.error('Missing required environment variables:', { 
      missing: missingEnvVars,
      environment: config.env 
    });
    
    // Critical configuration errors in production
    if (config.env === 'production') {
      logger.error('Production environment missing critical configuration');
      process.exit(1);
    } else {
      logger.warn('Development environment missing some configuration variables');
    }
  }

  // Enforce strong JWT secret in production
  if (config.env === 'production' && process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      logger.error('JWT_SECRET insufficient length for production', {
        length: process.env.JWT_SECRET.length,
        required: 32
      });
      process.exit(1);
    }
  }

  // Require external MongoDB in production
  if (config.env === 'production' && !process.env.MONGODB_URI) {
    logger.error('MONGODB_URI required in production environment');
    process.exit(1);
  }

  // Validate SMTP configuration completeness
  const smtpVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
  const smtpConfigured = smtpVars.filter(envVar => process.env[envVar]);
  
  if (smtpConfigured.length > 0 && smtpConfigured.length < smtpVars.length) {
    logger.warn('Incomplete SMTP configuration', {
      configured: smtpConfigured,
      missing: smtpVars.filter(envVar => !process.env[envVar])
    });
  }

  logger.info('Environment validation completed', {
    environment: config.env,
    missingVariables: missingEnvVars.length,
    smtpConfigured: smtpConfigured.length === smtpVars.length
  });
};

// Validate environment before starting server
validateEnvironment();

// Initialize database connection
connectDB();

// Start automated backup service
AutoBackupService.start();

const app = express();

// Configure proxy trust for deployment environments
app.set('trust proxy', 1); // Trust first proxy

// Apply security middleware
app.use(securityMiddleware);

// CORS configuration
const corsOptions = {
  origin: config.env === 'production'
    ? config.cors.origins
    : ['http://localhost:5173', 'http://localhost:3000', /\.app\.github\.dev$/],
  credentials: true,
};
app.use(cors(corsOptions));

// Apply rate limiting
app.use('/api', apiLimiter);
app.use('/api/auth', authLimiter);

// Body parsing middleware
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Request logging middleware
app.use(requestLogger);

// Public routes (no authentication required)
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

// Protected routes (authentication required)
app.use('/api/clients', auth, clientRoutes);
app.use('/api/invoices', auth, invoiceRoutes);
app.use('/api/exports', auth, exportRoutes);
app.use('/api/settings', auth, settingsRoutes);
app.use('/api/email', auth, emailRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bulk', auth, bulkRoutes);
app.use('/api/admin', auth, backupRoutes);

/**
 * Handle undefined routes - 404 Not Found
 * Catches all requests to non-existent endpoints
 */
app.all('*', (req, res) => {
  logger.warn('Route not found', { path: req.originalUrl, method: req.method, ip: req.ip });
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error logging middleware
app.use(errorLogger);

// Global error handler (must be last middleware)
app.use(errorHandler);

const PORT = config.port || process.env.PORT || 3001;

/**
 * Generate API documentation in non-production environments
 * Creates both JSON and Markdown documentation for development reference
 */
if (process.env.NODE_ENV !== 'production') {
  try {
    const ApiDocsGenerator = require('./utils/apiDocsGenerator');
    ApiDocsGenerator.saveDocsToFile();
    ApiDocsGenerator.generateMarkdownDocs();
    logger.info('API documentation generated successfully');
  } catch (error) {
    logger.warn('API documentation generation failed', { error: error.message });
  }
}

// Start HTTP server
const server = app.listen(PORT, () => {
  logger.info(`Server running in ${config.env} mode on port ${PORT}`, {
    environment: config.env,
    port: PORT,
    adminConfigured: !!process.env.ADMIN_USERNAME,
    databaseType: process.env.MONGODB_URI ? 'External' : 'Auto-detected',
    emailEnabled: !!process.env.SMTP_HOST
  });
});

/**
 * Graceful shutdown handler for SIGINT signal
 * Stops backup service and closes server connections
 */
process.on('SIGINT', async () => {
  logger.info('SIGINT received - initiating graceful shutdown');
  await AutoBackupService.stop();
  
  server.close(() => {
    logger.info('Process terminated via SIGINT');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.warn('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
});

/**
 * Graceful shutdown handler for SIGTERM signal  
 * Stops backup service and closes server connections
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received - initiating graceful shutdown');
  await AutoBackupService.stop();
  
  server.close(() => {
    logger.info('Process terminated via SIGTERM');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.warn('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
});

/**
 * Handle unhandled promise rejections
 * Logs error but allows application to continue running
 */
process.on('unhandledRejection', (err, promise) => {
  logger.error('Unhandled promise rejection', { 
    promise: promise.toString(),
    error: err.message 
  });
});

/**
 * Handle uncaught exceptions
 * Logs critical error and terminates process for safety
 */
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception - terminating process', { error: error.message });
  process.exit(1);
});

module.exports = app;
