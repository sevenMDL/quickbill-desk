/**
 * Application Configuration - Environment-based configuration management
 * @module config
 * @requires joi
 */

const Joi = require('joi');

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Environment validation schema with environment-specific rules
 */
const envSchema = Joi.object({
  // Core environment settings
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),

  // Database configuration
  MONGODB_URI: Joi.string().optional().allow('').description('MongoDB connection string'),

  // Authentication configuration
  ADMIN_USERNAME: Joi.string().required().description('Admin username'),
  ADMIN_PASSWORD: Joi.string().required().min(1).description('Admin password'),
  JWT_SECRET: Joi.string().required().min(1).description('JWT secret key'),
  JWT_EXPIRES_IN: Joi.string().default('7d'),

  // Email service configuration
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional().default(587),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  SMTP_FROM: Joi.string().email().optional(),

  // Stripe configuration
  STRIPE_SECRET_KEY: Joi.string().optional().allow(''),
  STRIPE_PUBLISHABLE_KEY: Joi.string().optional().allow(''),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional().allow(''),

  // Security and performance configuration
  CORS_ORIGINS: Joi.string().default(''),
  RATE_LIMIT_WINDOW_MS: Joi.number().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Health check configuration
  HEALTH_CHECK_CACHE_MS: Joi.number().default(30000)
}).unknown();

// Validate environment variables
const { value: envVars, error } = envSchema.validate(process.env);

if (error) {
  console.error('Configuration validation failed:');
  console.error('Missing or invalid environment variables:');
  error.details.forEach(detail => {
    console.error(`   - ${detail.message}`);
  });

  // Provide environment-specific setup guidance
  if (isDevelopment) {
    console.error('\nDevelopment Setup:');
    console.error('   1. Copy .env.example to .env');
    console.error('   2. Fill in ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET');
    console.error('   3. MONGODB_URI is optional - auto-detection will be used');
    console.error('   4. Restart the application');
  } else {
    console.error('\nProduction Setup:');
    console.error('   1. Set all required environment variables');
    console.error('   2. MONGODB_URI is required for production');
    console.error('   3. Use strong JWT_SECRET (min 32 characters)');
    console.error('   4. Configure SMTP for email features');
  }
  process.exit(1);
}

/**
 * Main application configuration object
 */
const config = {
  // Environment information
  env: envVars.NODE_ENV,
  isProduction,
  isDevelopment,

  // Server configuration
  port: envVars.PORT,

  // Database configuration
  mongoose: {
    url: envVars.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },

  // JWT authentication configuration
  jwt: {
    secret: envVars.JWT_SECRET,
    expiresIn: envVars.JWT_EXPIRES_IN,
  },

  // Email service configuration
  smtp: {
    host: envVars.SMTP_HOST,
    port: envVars.SMTP_PORT,
    user: envVars.SMTP_USER,
    pass: envVars.SMTP_PASS,
    from: envVars.SMTP_FROM,
    isConfigured: !!(envVars.SMTP_HOST && envVars.SMTP_USER && envVars.SMTP_PASS),
  },

  // Stripe configuration
  stripe: {
    secretKey: envVars.STRIPE_SECRET_KEY,
    publishableKey: envVars.STRIPE_PUBLISHABLE_KEY,
    webhookSecret: envVars.STRIPE_WEBHOOK_SECRET,
    isConfigured: !!(envVars.STRIPE_SECRET_KEY && envVars.STRIPE_PUBLISHABLE_KEY)
  },

  // CORS configuration
  cors: {
    origins: envVars.CORS_ORIGINS ? envVars.CORS_ORIGINS.split(',') : [],
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS,
    max: envVars.RATE_LIMIT_MAX_REQUESTS,
  },

  // Health check configuration
  health: {
    cacheMs: envVars.HEALTH_CHECK_CACHE_MS,
  }
};

// Environment-specific configuration validation and warnings
if (isDevelopment) {
  if (!envVars.MONGODB_URI) {
    console.log('Database: Using auto-detection (local → Docker → in-memory)');
  }

  if (envVars.JWT_SECRET.length < 32) {
    console.log('Security: JWT_SECRET is short (ok for dev, use 32+ chars for production)');
  }

  if (!config.smtp.isConfigured) {
    console.log('Email: SMTP not configured - email features disabled');
  }
}

// Production environment requirements
if (isProduction) {
  // Database requirement
  if (!envVars.MONGODB_URI) {
    console.error('PRODUCTION ERROR: MONGODB_URI is required in production');
    console.error('Use MongoDB Atlas or set up a MongoDB instance');
    process.exit(1);
  }

  // Security requirements
  if (envVars.JWT_SECRET.length < 32) {
    console.error('PRODUCTION ERROR: JWT_SECRET must be at least 32 characters long');
    console.error('Generate a strong secret: openssl rand -base64 32');
    process.exit(1);
  }

  // Recommended settings warnings
  if (!config.smtp.isConfigured) {
    console.warn('PRODUCTION WARNING: SMTP not configured - email features disabled');
  }
}

/**
 * Feature flags and behavior configuration
 */
config.features = {
  strictValidation: isProduction,
  autoDatabase: isDevelopment && !envVars.MONGODB_URI,
  emailEnabled: config.smtp.isConfigured,
  backupEnabled: true,
  healthChecks: true,
  securityLevel: isProduction ? 'high' : 'medium',
  loggingLevel: isProduction ? 'warn' : 'debug'
};

/**
 * Helper method to determine database behavior based on environment
 * @returns {string} Database behavior type
 */
config.getDatabaseBehavior = () => {
  if (envVars.MONGODB_URI) return 'provided-uri';
  if (isDevelopment) return 'auto-detect';
  return 'required';
};

/**
 * Helper method to determine if strict validation should be enforced
 * @returns {boolean} True if strict validation should be enforced
 */
config.shouldEnforceStrict = () => isProduction;

module.exports = config;
