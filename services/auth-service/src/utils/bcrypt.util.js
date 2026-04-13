/**
 * Bcrypt Password Utilities
 * =========================
 * 
 * Secure password hashing and comparison using bcrypt.
 * NEVER use MD5, SHA1, or plain text for passwords!
 */

const bcrypt = require('bcryptjs');
const securityConfig = require('../config/security.config');
const logger = require('./logger.util');

const SALT_ROUNDS = securityConfig.password.saltRounds;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
    try {
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(password, salt);
        logger.debug('Password hashed successfully');
        return hashedPassword;
    } catch (error) {
        logger.error('Error hashing password:', error.message);
        throw new Error('Failed to hash password');
    }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if passwords match
 */
const comparePassword = async (plainPassword, hashedPassword) => {
    try {
        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        return isMatch;
    } catch (error) {
        logger.error('Error comparing passwords:', error.message);
        throw new Error('Failed to compare passwords');
    }
};

/**
 * Check if a password was used before (password history check)
 * @param {string} newPassword - New plain text password
 * @param {Array<string>} passwordHistory - Array of previous hashed passwords
 * @returns {Promise<boolean>} True if password was used before
 */
const isPasswordInHistory = async (newPassword, passwordHistory) => {
    if (!passwordHistory || passwordHistory.length === 0) {
        return false;
    }

    for (const oldHashedPassword of passwordHistory) {
        const isMatch = await bcrypt.compare(newPassword, oldHashedPassword);
        if (isMatch) {
            return true;
        }
    }

    return false;
};

/**
 * Generate a secure random token (for password reset, email verification)
 * @param {number} length - Length of token in bytes (default: 32)
 * @returns {string} Hex encoded random token
 */
const generateSecureToken = (length = 32) => {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token for secure storage (using SHA256)
 * @param {string} token - Token to hash
 * @returns {string} Hashed token
 */
const hashToken = (token) => {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
    hashPassword,
    comparePassword,
    isPasswordInHistory,
    generateSecureToken,
    hashToken,
};
