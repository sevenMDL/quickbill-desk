/**
 * Winston Logger Configuration - Production-ready logging system
 * @module utils/logger
 * @requires winston
 * @requires path
 * @requires fs
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom log format for development
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Add metadata if present (excluding large objects)
    const cleanMeta = { ...meta };
    delete cleanMeta.timestamp;
    delete cleanMeta.level;
    delete cleanMeta.message;
    delete cleanMeta.stack;
    
    if (Object.keys(cleanMeta).length > 0) {
      // Limit meta output to prevent huge logs
      const limitedMeta = {};
      Object.keys(cleanMeta).forEach(key => {
        if (typeof cleanMeta[key] === 'object') {
          limitedMeta[key] = 'Object(' + Object.keys(cleanMeta[key]).length + ' keys)';
        } else {
          limitedMeta[key] = cleanMeta[key];
        }
      });
      log += ` | ${JSON.stringify(limitedMeta)}`;
    }
    
    return log;
  })
);

// Custom log format for production
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { 
    service: 'quickbill-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: []
});

// Development transports
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: developmentFormat
  }));
  
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'development.log'),
    format: developmentFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
  }));
}

// Production transports
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: productionFormat,
    maxsize: 20 * 1024 * 1024, // 20MB
    maxFiles: 10,
    tailable: true
  }));
  
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: productionFormat,
    maxsize: 20 * 1024 * 1024, // 20MB
    maxFiles: 10,
    tailable: true
  }));
  
  // Also log errors to console in production (for platforms like Railway/Render)
  logger.add(new winston.transports.Console({
    format: productionFormat,
    level: 'error'
  }));
}

// Custom log methods for specific events
logger.logBusinessEvent = (event, data = {}) => {
  const businessData = {
    event_type: event,
    ...data,
    category: 'business'
  };
  
  logger.info(`Business Event: ${event}`, businessData);
};

logger.logSecurityEvent = (event, data = {}) => {
  const securityData = {
    event_type: event,
    ...data,
    category: 'security'
  };
  
  logger.warn(`Security Event: ${event}`, securityData);
};

logger.logSystemEvent = (event, data = {}) => {
  const systemData = {
    event_type: event,
    ...data,
    category: 'system'
  };
  
  logger.info(`System Event: ${event}`, systemData);
};


module.exports = logger;
