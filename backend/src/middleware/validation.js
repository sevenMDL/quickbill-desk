/**
 * Request Validation Middleware - Validates request data against schemas
 * @module middleware/validation
 * @requires ../utils/logger
 */

const logger = require('../utils/logger');

/**
 * Validates request body against Joi schema and returns appropriate errors
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    // If no schema provided, skip validation
    if (!schema) {
      return next();
    }

    const { error } = schema.validate(req.body);
    
    if (error) {
      logger.warn('Request validation failed', {
        path: req.path,
        method: req.method,
        error: error.details[0].message
      });
      
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
        details: error.details
      });
    }
    
    logger.debug('Request validation passed', {
      path: req.path,
      method: req.method
    });
    
    next();
  };
};

/**
 * Validates that all required fields are present in request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Function} Express middleware function
 */
const validateRequiredFields = (requiredFields) => {
  return (req, res, next) => {
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      logger.warn('Required fields missing', {
        path: req.path,
        method: req.method,
        missingFields
      });
      
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    next();
  };
};

module.exports = {
  validateRequest,
  validateRequiredFields
};
