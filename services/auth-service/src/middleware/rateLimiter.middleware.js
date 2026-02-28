/**
 * Rate Limiter Middleware
 * =======================
 * 
 * Uses rate-limiter-flexible with Redis for distributed rate limiting.
 * Different limiters for different endpoint types.
 */

const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const { redis } = require('../config/redis.config');
const securityConfig = require('../config/security.config');
const { TooManyRequestsError } = require('../utils/errors.util');
const logger = require('../utils/logger.util');

// Rate limiter options
const rateLimitConfig = securityConfig.rateLimiting;

// Create rate limiters with Redis backend
let loginLimiter;
let apiLimiter;
let passwordResetLimiter;

/**
 * Initialize rate limiters
 * Falls back to memory if Redis is not available
 */
const initRateLimiters = () => {
    try {
        // Login rate limiter: 5 attempts per 15 minutes per IP
        loginLimiter = new RateLimiterRedis({
            storeClient: redis,
            keyPrefix: 'rl:login',
            points: rateLimitConfig.login.max,
            duration: Math.floor(rateLimitConfig.login.windowMs / 1000),
            blockDuration: 3600, // Block for 1 hour after limit exceeded
        });

        // General API rate limiter: 100 requests per 15 minutes per IP
        apiLimiter = new RateLimiterRedis({
            storeClient: redis,
            keyPrefix: 'rl:api',
            points: rateLimitConfig.api.max,
            duration: Math.floor(rateLimitConfig.api.windowMs / 1000),
        });

        // Password reset rate limiter: 3 requests per hour per IP
        passwordResetLimiter = new RateLimiterRedis({
            storeClient: redis,
            keyPrefix: 'rl:pwd_reset',
            points: rateLimitConfig.passwordReset.max,
            duration: Math.floor(rateLimitConfig.passwordReset.windowMs / 1000),
        });

        logger.info('Rate limiters initialized with Redis');
    } catch (error) {
        logger.warn('Redis not available for rate limiting, using memory store');

        // Fallback to memory-based rate limiting
        loginLimiter = new RateLimiterMemory({
            keyPrefix: 'rl:login',
            points: rateLimitConfig.login.max,
            duration: Math.floor(rateLimitConfig.login.windowMs / 1000),
        });

        apiLimiter = new RateLimiterMemory({
            keyPrefix: 'rl:api',
            points: rateLimitConfig.api.max,
            duration: Math.floor(rateLimitConfig.api.windowMs / 1000),
        });

        passwordResetLimiter = new RateLimiterMemory({
            keyPrefix: 'rl:pwd_reset',
            points: rateLimitConfig.passwordReset.max,
            duration: Math.floor(rateLimitConfig.passwordReset.windowMs / 1000),
        });
    }
};

// Initialize on module load
initRateLimiters();

/**
 * Create rate limiter middleware
 * @param {Object} limiter - Rate limiter instance
 * @param {string} type - Type of rate limit for error messages
 * @returns {Function} Express middleware
 */
const createRateLimiterMiddleware = (limiter, type) => {
    return async (req, res, next) => {
        try {
            // Use IP address as key, fallback to a default
            const key = req.ip || req.connection.remoteAddress || 'unknown';

            await limiter.consume(key);
            next();
        } catch (rejRes) {
            const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000) || 60;

            logger.security('Rate limit exceeded', {
                type,
                ip: req.ip,
                path: req.path,
                retryAfter,
            });

            const error = new TooManyRequestsError(
                `Too many ${type} attempts. Please try again later.`,
                retryAfter
            );
            next(error);
        }
    };
};

// Export middleware functions
const loginRateLimiter = createRateLimiterMiddleware(loginLimiter, 'login');
const apiRateLimiter = createRateLimiterMiddleware(apiLimiter, 'API');
const passwordResetRateLimiter = createRateLimiterMiddleware(passwordResetLimiter, 'password reset');

/**
 * Reset login rate limit for an IP (called on successful login)
 * @param {string} ip - IP address to reset
 */
const resetLoginLimit = async (ip) => {
    try {
        if (loginLimiter) {
            await loginLimiter.delete(ip);
            logger.debug(`Login rate limit reset for IP: ${ip}`);
        }
    } catch (error) {
        logger.error('Failed to reset login rate limit:', error.message);
    }
};

module.exports = {
    loginRateLimiter,
    apiRateLimiter,
    passwordResetRateLimiter,
    resetLoginLimit,
    initRateLimiters,
};
