/**
 * Centralized Error Handler Middleware
 * =====================================
 * 
 * Handles all errors and returns consistent error responses.
 * Logs errors and sends appropriate status codes.
 */

const logger = require('../utils/logger.util');
const { AppError } = require('../utils/errors.util');

/**
 * Error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
    // Default error values
    let statusCode = err.statusCode || 500;
    let errorCode = err.errorCode || 'INTERNAL_ERROR';
    let message = err.message || 'Something went wrong';
    let details = err.details || null;

    // Log the error
    const logData = {
        errorCode,
        statusCode,
        message,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userId: req.user?.id,
        requestId: req.headers['x-request-id'],
    };

    // Log based on error type
    if (statusCode >= 500) {
        logger.error('Server Error:', { ...logData, stack: err.stack });
    } else if (statusCode >= 400) {
        logger.warn('Client Error:', logData);
    }

    // Handle specific error types

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        errorCode = 'INVALID_TOKEN';
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        errorCode = 'TOKEN_EXPIRED';
        message = 'Token has expired';
    }

    // Prisma errors
    if (err.code === 'P2002') {
        statusCode = 409;
        errorCode = 'DUPLICATE_ENTRY';
        const field = err.meta?.target?.[0] || 'field';
        message = `${field} already exists`;
    }

    if (err.code === 'P2025') {
        statusCode = 404;
        errorCode = 'NOT_FOUND';
        message = 'Record not found';
    }

    // Validation errors from express-validator
    if (err.array && typeof err.array === 'function') {
        statusCode = 400;
        errorCode = 'VALIDATION_ERROR';
        message = 'Validation failed';
        details = err.array();
    }

    // Don't leak internal error details in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'An unexpected error occurred';
        details = null;
    }

    // Build error response
    const errorResponse = {
        success: false,
        error: {
            code: errorCode,
            message,
            timestamp: new Date().toISOString(),
        },
    };

    // Add details if present
    if (details) {
        errorResponse.error.details = details;
    }

    // Add retry-after header for rate limit errors
    if (err.retryAfter) {
        res.setHeader('Retry-After', err.retryAfter);
        errorResponse.error.retryAfter = err.retryAfter;
    }

    // Add unlock time for account locked errors
    if (err.unlockTime) {
        errorResponse.error.unlockTime = err.unlockTime;
    }

    // Add stack trace in development
    if (process.env.NODE_ENV === 'development') {
        errorResponse.error.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler for undefined routes
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Route ${req.method} ${req.path} not found`,
        404,
        'ROUTE_NOT_FOUND'
    );
    next(error);
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
