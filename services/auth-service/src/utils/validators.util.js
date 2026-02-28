/**
 * Input Validators
 * ================
 * 
 * Validation functions for user input.
 * Uses express-validator for route-level validation.
 */

const { body, validationResult } = require('express-validator');
const securityConfig = require('../config/security.config');

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} { valid: boolean, message?: string }
 */
const validatePassword = (password) => {
    const config = securityConfig.password;

    if (!password || password.length < config.minLength) {
        return {
            valid: false,
            message: `Password must be at least ${config.minLength} characters`
        };
    }

    if (config.requireUppercase && !/[A-Z]/.test(password)) {
        return {
            valid: false,
            message: 'Password must contain at least one uppercase letter'
        };
    }

    if (config.requireLowercase && !/[a-z]/.test(password)) {
        return {
            valid: false,
            message: 'Password must contain at least one lowercase letter'
        };
    }

    if (config.requireNumbers && !/\d/.test(password)) {
        return {
            valid: false,
            message: 'Password must contain at least one number'
        };
    }

    if (config.requireSpecialChar) {
        const specialCharRegex = new RegExp(`[${config.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
        if (!specialCharRegex.test(password)) {
            return {
                valid: false,
                message: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)'
            };
        }
    }

    return { valid: true };
};

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean}
 */
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Validate phone number format (international)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean}
 */
const isValidPhoneNumber = (phoneNumber) => {
    // Accepts formats like: +1234567890, 1234567890, +1-234-567-8900
    const phoneRegex = /^\+?[\d\s-]{10,15}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s-]/g, ''));
};

// ================================
// Express Validator Rules
// ================================

/**
 * Registration validation rules
 */
const registerValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required')
        .custom((value) => {
            const result = validatePassword(value);
            if (!result.valid) {
                throw new Error(result.message);
            }
            return true;
        }),

    body('firstName')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),

    body('lastName')
        .trim()
        .notEmpty().withMessage('Last name is required')
        .isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),

    body('phoneNumber')
        .trim()
        .notEmpty().withMessage('Phone number is required')
        .custom((value) => {
            if (!isValidPhoneNumber(value)) {
                throw new Error('Invalid phone number format');
            }
            return true;
        }),

    body('role')
        .optional()
        .isIn(['CUSTOMER', 'DRIVER']).withMessage('Role must be CUSTOMER or DRIVER'),
];

/**
 * Login validation rules
 */
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('Password is required'),

    body('twoFactorCode')
        .optional()
        .isLength({ min: 6, max: 6 }).withMessage('2FA code must be 6 digits')
        .isNumeric().withMessage('2FA code must be numeric'),
];

/**
 * Refresh token validation rules
 */
const refreshTokenValidation = [
    body('refreshToken')
        .notEmpty().withMessage('Refresh token is required'),
];

/**
 * Forgot password validation rules
 */
const forgotPasswordValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
];

/**
 * Reset password validation rules
 */
const resetPasswordValidation = [
    body('token')
        .notEmpty().withMessage('Reset token is required'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .custom((value) => {
            const result = validatePassword(value);
            if (!result.valid) {
                throw new Error(result.message);
            }
            return true;
        }),
];

/**
 * Change password validation rules
 */
const changePasswordValidation = [
    body('currentPassword')
        .notEmpty().withMessage('Current password is required'),

    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('New password must be different from current password');
            }
            const result = validatePassword(value);
            if (!result.valid) {
                throw new Error(result.message);
            }
            return true;
        }),
];

/**
 * Validation result handler
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Validation failed',
                details: errors.array().map(err => ({
                    field: err.path,
                    message: err.msg,
                })),
                timestamp: new Date().toISOString(),
            },
        });
    }

    next();
};

module.exports = {
    // Standalone validators
    validatePassword,
    isValidEmail,
    isValidPhoneNumber,

    // Express validator rules
    registerValidation,
    loginValidation,
    refreshTokenValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    changePasswordValidation,

    // Middleware
    handleValidationErrors,
};
