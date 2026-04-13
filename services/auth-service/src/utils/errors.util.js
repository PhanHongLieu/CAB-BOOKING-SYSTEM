/**
 * Custom Error Classes
 * ====================
 * 
 * Standardized error classes for the Auth Service.
 * Each error has a specific HTTP status code and error code.
 */

/**
 * Base Application Error
 */
class AppError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation Error (400)
 */
class ValidationError extends AppError {
    constructor(message = 'Validation failed', details = null) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

/**
 * Unauthorized Error (401)
 */
class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

/**
 * Invalid Credentials Error (401)
 */
class InvalidCredentialsError extends AppError {
    constructor(message = 'Invalid email or password') {
        super(message, 401, 'INVALID_CREDENTIALS');
    }
}

/**
 * Invalid Token Error (401)
 */
class InvalidTokenError extends AppError {
    constructor(message = 'Invalid or expired token') {
        super(message, 401, 'INVALID_TOKEN');
    }
}

/**
 * Token Revoked Error (401)
 */
class TokenRevokedError extends AppError {
    constructor(message = 'Token has been revoked') {
        super(message, 401, 'TOKEN_REVOKED');
    }
}

/**
 * Forbidden Error (403)
 */
class ForbiddenError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'FORBIDDEN');
    }
}

/**
 * Not Found Error (404)
 */
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}

/**
 * User Not Found Error (404)
 */
class UserNotFoundError extends AppError {
    constructor(message = 'User not found') {
        super(message, 404, 'USER_NOT_FOUND');
    }
}

/**
 * Conflict Error (409)
 */
class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}

/**
 * Duplicate Email Error (409)
 */
class DuplicateEmailError extends AppError {
    constructor(message = 'Email already registered') {
        super(message, 409, 'DUPLICATE_EMAIL');
    }
}

/**
 * Duplicate Phone Error (409)
 */
class DuplicatePhoneError extends AppError {
    constructor(message = 'Phone number already registered') {
        super(message, 409, 'DUPLICATE_PHONE');
    }
}

/**
 * Account Locked Error (423)
 */
class AccountLockedError extends AppError {
    constructor(message = 'Account is locked', unlockTime = null) {
        super(message, 423, 'ACCOUNT_LOCKED');
        this.unlockTime = unlockTime;
    }
}

/**
 * Too Many Requests Error (429)
 */
class TooManyRequestsError extends AppError {
    constructor(message = 'Too many requests', retryAfter = null) {
        super(message, 429, 'TOO_MANY_REQUESTS');
        this.retryAfter = retryAfter;
    }
}

/**
 * Password History Error (400)
 */
class PasswordHistoryError extends AppError {
    constructor(message = 'Password was used recently') {
        super(message, 400, 'PASSWORD_HISTORY');
    }
}

/**
 * Email Not Verified Error (403)
 */
class EmailNotVerifiedError extends AppError {
    constructor(message = 'Email not verified') {
        super(message, 403, 'EMAIL_NOT_VERIFIED');
    }
}

/**
 * Internal Server Error (500)
 */
class InternalServerError extends AppError {
    constructor(message = 'Internal server error') {
        super(message, 500, 'INTERNAL_ERROR');
        this.isOperational = false;
    }
}

module.exports = {
    AppError,
    ValidationError,
    UnauthorizedError,
    InvalidCredentialsError,
    InvalidTokenError,
    TokenRevokedError,
    ForbiddenError,
    NotFoundError,
    UserNotFoundError,
    ConflictError,
    DuplicateEmailError,
    DuplicatePhoneError,
    AccountLockedError,
    TooManyRequestsError,
    PasswordHistoryError,
    EmailNotVerifiedError,
    InternalServerError,
};
