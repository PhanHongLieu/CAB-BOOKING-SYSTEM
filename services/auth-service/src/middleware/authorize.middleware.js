/**
 * Authorization Middleware
 * ========================
 * 
 * Checks if authenticated user has required role.
 * Must be used after authentication middleware.
 */

const { ForbiddenError } = require('../utils/errors.util');
const logger = require('../utils/logger.util');

/**
 * Authorization middleware factory
 * Checks if user has one of the allowed roles
 * @param {...string} allowedRoles - Roles that are allowed to access
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.post('/admin-only', authenticate, authorize('ADMIN'), handler)
 * router.get('/staff', authenticate, authorize('ADMIN', 'DRIVER'), handler)
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        try {
            // Check if user exists (authenticate middleware should have run first)
            if (!req.user) {
                throw new ForbiddenError('Authentication required');
            }

            // Check if user's role is in allowed roles
            if (!allowedRoles.includes(req.user.role)) {
                logger.security('Authorization failed', {
                    userId: req.user.id,
                    userRole: req.user.role,
                    requiredRoles: allowedRoles,
                    path: req.path,
                    method: req.method,
                });

                throw new ForbiddenError(
                    `Access denied. Required role: ${allowedRoles.join(' or ')}`
                );
            }

            logger.debug(`Authorization passed for user ${req.user.id} with role ${req.user.role}`);
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Check if user owns the resource or is admin
 * @param {Function} getResourceOwnerId - Function to get owner ID from request
 * @returns {Function} Express middleware function
 * 
 * @example
 * router.put('/profile/:id', authenticate, authorizeOwner((req) => req.params.id), handler)
 */
const authorizeOwner = (getResourceOwnerId) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new ForbiddenError('Authentication required');
            }

            const resourceOwnerId = getResourceOwnerId(req);
            const isOwner = req.user.id === resourceOwnerId;
            const isAdmin = req.user.role === 'ADMIN';

            if (!isOwner && !isAdmin) {
                logger.security('Owner authorization failed', {
                    userId: req.user.id,
                    resourceOwnerId,
                    path: req.path,
                    method: req.method,
                });

                throw new ForbiddenError('You do not have permission to access this resource');
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Check if user has verified email
 * @returns {Function} Express middleware function
 */
const requireEmailVerified = (req, res, next) => {
    try {
        if (!req.user) {
            throw new ForbiddenError('Authentication required');
        }

        if (!req.user.isEmailVerified) {
            throw new ForbiddenError('Email verification required');
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authorize,
    authorizeOwner,
    requireEmailVerified,
};
