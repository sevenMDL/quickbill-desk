/**
 * Async Handler Utility - Wraps async functions to automatically catch errors
 * @module middleware/asyncHandler
 */

/**
 * Wraps an async function to automatically catch errors and pass them to Express error handler
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
