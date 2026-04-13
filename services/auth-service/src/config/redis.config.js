/**
 * Redis Configuration
 * ====================
 * 
 * Provides Redis client for:
 * - Token blacklisting
 * - Rate limiting
 * - Session caching
 */

const Redis = require('ioredis');
const logger = require('../utils/logger.util');

// Redis configuration from environment
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    retryDelayOnFailover: 100,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
};

// Create Redis client
const redis = new Redis(redisConfig);

// Connection event handlers
redis.on('connect', () => {
    logger.info('✅ Redis connected successfully');
});

redis.on('error', (err) => {
    logger.error('❌ Redis connection error:', err.message);
});

redis.on('close', () => {
    logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
    logger.info('Redis reconnecting...');
});

/**
 * Redis key prefixes for different purposes
 */
const REDIS_KEYS = {
    TOKEN_BLACKLIST: 'blacklist:',
    RATE_LIMIT: 'rl:',
    SESSION: 'session:',
    PASSWORD_RESET: 'pwd_reset:',
    EMAIL_VERIFICATION: 'email_verify:',
};

/**
 * Add token to blacklist
 * @param {string} tokenHash - Hashed token
 * @param {string} userId - User ID
 * @param {number} ttlSeconds - Time to live in seconds
 */
const blacklistToken = async (tokenHash, userId, ttlSeconds) => {
    const key = `${REDIS_KEYS.TOKEN_BLACKLIST}${tokenHash}`;
    await redis.setex(key, ttlSeconds, userId);
    logger.debug(`Token blacklisted: ${key}`);
};

/**
 * Check if token is blacklisted
 * @param {string} tokenHash - Hashed token
 * @returns {Promise<boolean>}
 */
const isTokenBlacklisted = async (tokenHash) => {
    const key = `${REDIS_KEYS.TOKEN_BLACKLIST}${tokenHash}`;
    const result = await redis.exists(key);
    return result === 1;
};

/**
 * Store session data
 * @param {string} userId - User ID
 * @param {Object} data - Session data
 * @param {number} ttlSeconds - Time to live in seconds
 */
const setSession = async (userId, data, ttlSeconds = 900) => {
    const key = `${REDIS_KEYS.SESSION}${userId}`;
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
};

/**
 * Get session data
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
const getSession = async (userId) => {
    const key = `${REDIS_KEYS.SESSION}${userId}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
};

/**
 * Delete session
 * @param {string} userId - User ID
 */
const deleteSession = async (userId) => {
    const key = `${REDIS_KEYS.SESSION}${userId}`;
    await redis.del(key);
};

/**
 * Health check for Redis connection
 * @returns {Promise<Object>}
 */
const checkRedisHealth = async () => {
    const startTime = Date.now();
    try {
        await redis.ping();
        const latency = Date.now() - startTime;
        return {
            status: 'up',
            latency,
        };
    } catch (error) {
        return {
            status: 'down',
            error: error.message,
        };
    }
};

/**
 * Gracefully close Redis connection
 */
const closeRedis = async () => {
    try {
        await redis.quit();
        logger.info('Redis connection closed gracefully');
    } catch (error) {
        logger.error('Error closing Redis connection:', error.message);
        redis.disconnect();
    }
};

module.exports = {
    redis,
    REDIS_KEYS,
    blacklistToken,
    isTokenBlacklisted,
    setSession,
    getSession,
    deleteSession,
    checkRedisHealth,
    closeRedis,
};
