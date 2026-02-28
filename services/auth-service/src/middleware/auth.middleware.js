/**
 * Authentication Middleware
 * =========================
 * 
 * Verifies JWT access tokens and attaches user to request.
 * Checks token blacklist in Redis.
 */

const jwtUtil = require('../utils/jwt.util');
const { prisma } = require('../config/database.config');
const { isTokenBlacklisted } = require('../config/redis.config');
const {
    UnauthorizedError,
    InvalidTokenError,
    TokenRevokedError,
    UserNotFoundError
} = require('../utils/errors.util');
const logger = require('../utils/logger.util');

/**
 * Authentication middleware
 * Verifies JWT and attaches user to request
 */
const authenticate = async (req, res, next) => {
    try {
        // 1. Extract token from Authorization header
        const authHeader = req.headers.authorization;
        const token = jwtUtil.extractTokenFromHeader(authHeader);

        if (!token) {
            throw new UnauthorizedError('No token provided');
        }

        // 2. Check if token is blacklisted in Redis
        const tokenHash = jwtUtil.hashToken(token);
        const isBlacklisted = await isTokenBlacklisted(tokenHash);

        if (isBlacklisted) {
            throw new TokenRevokedError('Token has been revoked');
        }

        // 3. Verify JWT signature and expiration
        let decoded;
        try {
            decoded = jwtUtil.verifyAccessToken(token);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new InvalidTokenError('Token has expired');
            }
            throw new InvalidTokenError('Invalid token');
        }

        // 4. Find user in database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                phoneNumber: true,
                isActive: true,
                isEmailVerified: true,
                twoFactorEnabled: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new UserNotFoundError('User not found');
        }

        // 5. Check if user is active
        if (!user.isActive) {
            throw new UnauthorizedError('User account is deactivated');
        }

        // 6. Attach user and token info to request
        req.user = user;
        req.token = token;
        req.tokenPayload = decoded;

        logger.debug(`User authenticated: ${user.id}`);
        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = jwtUtil.extractTokenFromHeader(authHeader);

        if (!token) {
            return next();
        }

        const tokenHash = jwtUtil.hashToken(token);
        const isBlacklisted = await isTokenBlacklisted(tokenHash);

        if (isBlacklisted) {
            return next();
        }

        try {
            const decoded = jwtUtil.verifyAccessToken(token);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    firstName: true,
                    lastName: true,
                    isActive: true,
                },
            });

            if (user && user.isActive) {
                req.user = user;
                req.token = token;
                req.tokenPayload = decoded;
            }
        } catch (error) {
            // Token invalid, continue without user
        }

        next();
    } catch (error) {
        next();
    }
};

module.exports = {
    authenticate,
    optionalAuth,
};
