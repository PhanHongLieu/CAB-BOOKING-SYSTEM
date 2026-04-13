/**
 * Token Service
 * =============
 * 
 * Manages JWT tokens: generation, verification, storage, and revocation.
 */

const { prisma } = require('../config/database.config');
const { blacklistToken, isTokenBlacklisted } = require('../config/redis.config');
const securityConfig = require('../config/security.config');
const jwtUtil = require('../utils/jwt.util');
const logger = require('../utils/logger.util');
const {
    InvalidTokenError,
    TokenRevokedError,
    UserNotFoundError,
} = require('../utils/errors.util');

/**
 * Store a refresh token in the database
 * @param {Object} tokenData - Token data to store
 */
const storeRefreshToken = async (tokenData) => {
    const { token, userId, expiresAt, createdByIp } = tokenData;

    // Hash the token for secure storage
    const tokenHash = jwtUtil.hashToken(token);

    await prisma.refreshToken.create({
        data: {
            token: tokenHash,
            userId,
            expiresAt,
            createdByIp,
            isActive: true,
        },
    });

    logger.debug(`Refresh token stored for user: ${userId}`);
};

/**
 * Refresh access and refresh tokens
 * @param {string} refreshToken - Current refresh token
 * @param {string} clientIp - Client IP address
 * @returns {Promise<Object>} New tokens
 */
const refreshTokens = async (refreshToken, clientIp) => {
    // 1. Verify token signature and expiration
    let decoded;
    try {
        decoded = jwtUtil.verifyRefreshToken(refreshToken);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new InvalidTokenError('Refresh token has expired');
        }
        throw new InvalidTokenError('Invalid refresh token');
    }

    // 2. Find token in database
    const tokenHash = jwtUtil.hashToken(refreshToken);
    const storedToken = await prisma.refreshToken.findFirst({
        where: { token: tokenHash },
        include: { user: true },
    });

    if (!storedToken) {
        logger.security('REFRESH_TOKEN_NOT_FOUND', {
            userId: decoded.userId,
            tokenId: decoded.tokenId,
        });
        throw new InvalidTokenError('Refresh token not found');
    }

    // 3. Check if token is revoked
    if (!storedToken.isActive || storedToken.revokedAt) {
        // Token reuse detection - potential attack
        logger.security('REFRESH_TOKEN_REUSE_DETECTED', {
            userId: storedToken.userId,
            tokenId: storedToken.id,
            ip: clientIp,
        });

        // Revoke all tokens for this user (security measure)
        await prisma.refreshToken.updateMany({
            where: { userId: storedToken.userId },
            data: {
                isActive: false,
                revokedAt: new Date(),
                revokedByIp: clientIp,
            },
        });

        throw new TokenRevokedError('Refresh token has been revoked. All sessions invalidated for security.');
    }

    // 4. Check if token is expired in database
    if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
        });
        throw new InvalidTokenError('Refresh token has expired');
    }

    // 5. Check if user is still active
    if (!storedToken.user || !storedToken.user.isActive) {
        throw new UserNotFoundError('User not found or inactive');
    }

    const user = storedToken.user;

    // 6. Generate new access token
    const newAccessToken = jwtUtil.generateAccessToken(user);

    // 7. Token rotation (if enabled)
    let newRefreshToken = refreshToken;

    if (securityConfig.jwt.refreshToken.rotation) {
        // Generate new refresh token
        const refreshTokenData = jwtUtil.generateRefreshToken(user);
        newRefreshToken = refreshTokenData.token;
        const newTokenHash = jwtUtil.hashToken(newRefreshToken);

        // Revoke old token and create new one in transaction
        await prisma.$transaction([
            prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: {
                    isActive: false,
                    revokedAt: new Date(),
                    revokedByIp: clientIp,
                    replacedByToken: newTokenHash,
                },
            }),
            prisma.refreshToken.create({
                data: {
                    token: newTokenHash,
                    userId: user.id,
                    expiresAt: refreshTokenData.expiresAt,
                    createdByIp: clientIp,
                    isActive: true,
                },
            }),
        ]);

        logger.debug(`Refresh token rotated for user: ${user.id}`);
    } else {
        // Update usage stats
        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: {
                lastUsedAt: new Date(),
                usageCount: { increment: 1 },
            },
        });
    }

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    };
};

/**
 * Revoke a specific refresh token
 * @param {string} refreshToken - Token to revoke
 * @param {string} clientIp - Client IP address
 */
const revokeRefreshToken = async (refreshToken, clientIp) => {
    const tokenHash = jwtUtil.hashToken(refreshToken);

    const result = await prisma.refreshToken.updateMany({
        where: {
            token: tokenHash,
            isActive: true,
        },
        data: {
            isActive: false,
            revokedAt: new Date(),
            revokedByIp: clientIp,
        },
    });

    if (result.count > 0) {
        logger.debug('Refresh token revoked');
    }
};

/**
 * Revoke all refresh tokens for a user
 * @param {string} userId - User ID
 * @param {string} clientIp - Client IP address
 * @param {string} exceptToken - Token to keep active (optional)
 */
const revokeAllUserTokens = async (userId, clientIp, exceptToken = null) => {
    const where = {
        userId,
        isActive: true,
    };

    if (exceptToken) {
        const exceptHash = jwtUtil.hashToken(exceptToken);
        where.token = { not: exceptHash };
    }

    const result = await prisma.refreshToken.updateMany({
        where,
        data: {
            isActive: false,
            revokedAt: new Date(),
            revokedByIp: clientIp,
        },
    });

    logger.debug(`Revoked ${result.count} refresh tokens for user: ${userId}`);
};

/**
 * Clean up expired tokens (scheduled job)
 */
const cleanupExpiredTokens = async () => {
    const result = await prisma.refreshToken.deleteMany({
        where: {
            expiresAt: {
                lt: new Date(),
            },
        },
    });

    if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired refresh tokens`);
    }
};

/**
 * Get active sessions for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
const getUserSessions = async (userId) => {
    const sessions = await prisma.refreshToken.findMany({
        where: {
            userId,
            isActive: true,
            expiresAt: { gt: new Date() },
        },
        select: {
            id: true,
            createdByIp: true,
            lastUsedAt: true,
            usageCount: true,
            createdAt: true,
            expiresAt: true,
        },
        orderBy: { lastUsedAt: 'desc' },
    });

    return sessions;
};

/**
 * Blacklist an access token
 * @param {string} accessToken - Access token to blacklist
 * @param {string} userId - User ID
 */
const blacklistAccessToken = async (accessToken, userId) => {
    try {
        const decoded = jwtUtil.decodeToken(accessToken);
        if (!decoded) return;

        const tokenHash = jwtUtil.hashToken(accessToken);
        const ttl = jwtUtil.getTokenRemainingTTL(decoded);

        if (ttl > 0) {
            await blacklistToken(tokenHash, userId, ttl);
            logger.debug(`Access token blacklisted for user: ${userId}`);
        }
    } catch (error) {
        logger.error('Failed to blacklist access token:', error.message);
    }
};

module.exports = {
    storeRefreshToken,
    refreshTokens,
    revokeRefreshToken,
    revokeAllUserTokens,
    cleanupExpiredTokens,
    getUserSessions,
    blacklistAccessToken,
};
