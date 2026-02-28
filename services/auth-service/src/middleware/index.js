/**
 * Middleware Index
 * ================
 * 
 * Exports all middleware modules.
 */

const { authenticate, optionalAuth } = require('./auth.middleware');
const { authorize, authorizeOwner, requireEmailVerified } = require('./authorize.middleware');
const { errorHandler, notFoundHandler } = require('./errorHandler.middleware');
const { loginRateLimiter, apiRateLimiter, passwordResetRateLimiter, resetLoginLimit } = require('./rateLimiter.middleware');

module.exports = {
    // Authentication
    authenticate,
    optionalAuth,

    // Authorization
    authorize,
    authorizeOwner,
    requireEmailVerified,

    // Error handling
    errorHandler,
    notFoundHandler,

    // Rate limiting
    loginRateLimiter,
    apiRateLimiter,
    passwordResetRateLimiter,
    resetLoginLimit,
};
