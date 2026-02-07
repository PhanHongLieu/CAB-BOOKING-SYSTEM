/**
 * Async Handler Utility
 * =====================
 * 
 * Wraps async route handlers to properly catch errors
 * and pass them to the Express error handler.
 */

/**
 * Async handler wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
