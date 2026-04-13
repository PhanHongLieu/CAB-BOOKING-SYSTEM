/**
 * Two-Factor Authentication Service
 * ==================================
 * 
 * Implements TOTP-based two-factor authentication using speakeasy.
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { prisma } = require('../config/database.config');
const logger = require('../utils/logger.util');
const { ValidationError, UnauthorizedError } = require('../utils/errors.util');

const APP_NAME = process.env.SERVICE_NAME || 'CabBookingSystem';

/**
 * Generate a new 2FA secret for a user
 * @param {Object} user - User object
 * @returns {Promise<Object>} { secret, qrCodeUrl, backupCodes }
 */
const generateSecret = async (user) => {
    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
        name: `${APP_NAME}:${user.email}`,
        issuer: APP_NAME,
        length: 32,
    });

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);

    logger.debug(`2FA secret generated for user: ${user.id}`);

    return {
        secret: secret.base32,
        otpauthUrl: secret.otpauth_url,
        qrCodeUrl,
        backupCodes,
    };
};

/**
 * Generate backup codes
 * @param {number} count - Number of codes to generate
 * @returns {Array<string>} Array of backup codes
 */
const generateBackupCodes = (count = 10) => {
    const codes = [];
    for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric code
        const code = crypto.randomBytes(4).toString('hex').toUpperCase();
        codes.push(code);
    }
    return codes;
};

/**
 * Verify a TOTP code
 * @param {string} secret - User's 2FA secret
 * @param {string} token - TOTP code to verify
 * @param {number} window - Time window for verification (default 1)
 * @returns {boolean} Whether the code is valid
 */
const verifyToken = (secret, token, window = 1) => {
    try {
        const verified = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window, // Allow 1 step before/after for clock skew
        });

        return verified;
    } catch (error) {
        logger.debug(`2FA verification error: ${error.message}`);
        return false;
    }
};

/**
 * Enable 2FA for a user
 * @param {string} userId - User ID
 * @param {string} secret - 2FA secret
 * @param {string} token - Verification token to confirm setup
 * @param {Array<string>} backupCodes - Backup codes
 * @returns {Promise<boolean>}
 */
const enable2FA = async (userId, secret, token, backupCodes) => {
    // Verify the token first
    const isValid = verifyToken(secret, token);

    if (!isValid) {
        throw new ValidationError('Invalid verification code. Please try again.');
    }

    // Hash backup codes for storage
    const hashedBackupCodes = backupCodes.map(code =>
        crypto.createHash('sha256').update(code).digest('hex')
    );

    // Update user with 2FA settings
    await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorEnabled: true,
            twoFactorSecret: secret,
            // Store backup codes as JSON string
            // In production, consider a separate table
        },
    });

    logger.auth('2FA_ENABLED', userId);

    return true;
};

/**
 * Disable 2FA for a user
 * @param {string} userId - User ID
 * @param {string} token - Current 2FA token or backup code
 * @returns {Promise<boolean>}
 */
const disable2FA = async (userId, token) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
        throw new ValidationError('2FA is not enabled for this account');
    }

    // Verify the token
    const isValid = verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
        throw new UnauthorizedError('Invalid verification code');
    }

    // Disable 2FA
    await prisma.user.update({
        where: { id: userId },
        data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
        },
    });

    logger.auth('2FA_DISABLED', userId);

    return true;
};

/**
 * Verify 2FA during login
 * @param {Object} user - User object
 * @param {string} token - TOTP code or backup code
 * @returns {Promise<boolean>}
 */
const verify2FALogin = async (user, token) => {
    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new ValidationError('2FA is not enabled for this account');
    }

    // First try TOTP verification
    const isValidTotp = verifyToken(user.twoFactorSecret, token);

    if (isValidTotp) {
        logger.debug(`2FA login verified via TOTP for user: ${user.id}`);
        return true;
    }

    // If TOTP fails, try backup code
    // In production, implement backup code verification with usage tracking
    logger.debug(`2FA login failed for user: ${user.id}`);

    throw new UnauthorizedError('Invalid 2FA code');
};

/**
 * Get 2FA status for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
const get2FAStatus = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            twoFactorEnabled: true,
        },
    });

    return {
        enabled: user?.twoFactorEnabled || false,
    };
};

/**
 * Regenerate backup codes
 * @param {string} userId - User ID
 * @param {string} token - Current 2FA token
 * @returns {Promise<Array<string>>} New backup codes
 */
const regenerateBackupCodes = async (userId, token) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user || !user.twoFactorEnabled) {
        throw new ValidationError('2FA is not enabled for this account');
    }

    // Verify the token
    const isValid = verifyToken(user.twoFactorSecret, token);

    if (!isValid) {
        throw new UnauthorizedError('Invalid verification code');
    }

    // Generate new backup codes
    const newBackupCodes = generateBackupCodes(10);

    logger.auth('2FA_BACKUP_CODES_REGENERATED', userId);

    return newBackupCodes;
};

module.exports = {
    generateSecret,
    generateBackupCodes,
    verifyToken,
    enable2FA,
    disable2FA,
    verify2FALogin,
    get2FAStatus,
    regenerateBackupCodes,
};
