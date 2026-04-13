/**
 * JWT Token Utilities
 * ===================
 * 
 * Secure JWT token generation and verification.
 * Uses separate secrets for access and refresh tokens.
 */

const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const securityConfig = require('../config/security.config');
const logger = require('./logger.util');

const accessTokenConfig = securityConfig.jwt.accessToken;
const refreshTokenConfig = securityConfig.jwt.refreshToken;

/**
 * Generate an access token
 * @param {Object} user - User object
 * @returns {string} Access token
 */
const generateAccessToken = (user) => {
    const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'access',
    };

    const token = jwt.sign(payload, accessTokenConfig.secret, {
        expiresIn: accessTokenConfig.expiresIn,
        algorithm: accessTokenConfig.algorithm,
    });

    logger.debug(`Access token generated for user: ${user.id}`);
    return token;
};

/**
 * Generate a refresh token
 * @param {Object} user - User object
 * @returns {Object} { token, tokenId, expiresAt }
 */
const generateRefreshToken = (user) => {
    const tokenId = uuidv4();

    const payload = {
        userId: user.id,
        tokenId,
        type: 'refresh',
    };

    const token = jwt.sign(payload, refreshTokenConfig.secret, {
        expiresIn: refreshTokenConfig.expiresIn,
    });

    // Calculate expiration date
    const decoded = jwt.decode(token);
    const expiresAt = new Date(decoded.exp * 1000);

    logger.debug(`Refresh token generated for user: ${user.id}, tokenId: ${tokenId}`);

    return {
        token,
        tokenId,
        expiresAt,
    };
};

/**
 * Verify an access token
 * @param {string} token - Access token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, accessTokenConfig.secret, {
            algorithms: [accessTokenConfig.algorithm],
        });

        if (decoded.type !== 'access') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        logger.debug(`Access token verification failed: ${error.message}`);
        throw error;
    }
};

/**
 * Verify a refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, refreshTokenConfig.secret);

        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        logger.debug(`Refresh token verification failed: ${error.message}`);
        throw error;
    }
};

/**
 * Decode a token without verification
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
const decodeToken = (token) => {
    try {
        return jwt.decode(token);
    } catch (error) {
        return null;
    }
};

/**
 * Generate a hash of the token for storage/blacklisting
 * @param {string} token - JWT token
 * @returns {string} SHA256 hash of the token
 */
const hashToken = (token) => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Token or null
 */
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.slice(7);
};

/**
 * Calculate remaining TTL of a token in seconds
 * @param {Object} decodedToken - Decoded token with exp claim
 * @returns {number} Remaining seconds until expiration
 */
const getTokenRemainingTTL = (decodedToken) => {
    if (!decodedToken || !decodedToken.exp) {
        return 0;
    }
    const now = Math.floor(Date.now() / 1000);
    const remaining = decodedToken.exp - now;
    return Math.max(0, remaining);
};

/**
 * Generate a service-to-service token
 * @param {string} serviceId - Service identifier
 * @param {Array<string>} permissions - Service permissions
 * @returns {string} Service token
 */
const generateServiceToken = (serviceId, permissions = []) => {
    const payload = {
        serviceId,
        permissions,
        type: 'service',
    };

    const token = jwt.sign(payload, accessTokenConfig.secret, {
        expiresIn: '1h',
        algorithm: accessTokenConfig.algorithm,
    });

    logger.debug(`Service token generated for: ${serviceId}`);
    return token;
};

/**
 * Verify a service-to-service token
 * @param {string} token - Service token
 * @returns {Object} Decoded token payload
 */
const verifyServiceToken = (token) => {
    try {
        const decoded = jwt.verify(token, accessTokenConfig.secret, {
            algorithms: [accessTokenConfig.algorithm],
        });

        if (decoded.type !== 'service') {
            throw new Error('Invalid token type');
        }

        return decoded;
    } catch (error) {
        logger.debug(`Service token verification failed: ${error.message}`);
        throw error;
    }
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    decodeToken,
    hashToken,
    extractTokenFromHeader,
    getTokenRemainingTTL,
    generateServiceToken,
    verifyServiceToken,
};
