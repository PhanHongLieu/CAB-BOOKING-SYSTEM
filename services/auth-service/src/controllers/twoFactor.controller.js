/**
 * Two-Factor Authentication Controller
 * =====================================
 * 
 * Handles 2FA setup, verification, and management.
 */

const twoFactorService = require('../services/twoFactor.service');
const { asyncHandler } = require('../utils/asyncHandler.util');
const logger = require('../utils/logger.util');

/**
 * Get 2FA status
 * GET /api/v1/auth/2fa/status
 */
const getStatus = asyncHandler(async (req, res) => {
    const status = await twoFactorService.get2FAStatus(req.user.id);

    res.json({
        success: true,
        data: status,
    });
});

/**
 * Generate 2FA secret and QR code
 * POST /api/v1/auth/2fa/setup
 */
const setup = asyncHandler(async (req, res) => {
    const { secret, qrCodeUrl, backupCodes } = await twoFactorService.generateSecret(req.user);

    res.json({
        success: true,
        message: 'Scan the QR code with your authenticator app, then verify with a code.',
        data: {
            secret,
            qrCodeUrl,
            backupCodes,
        },
    });
});

/**
 * Enable 2FA (verify and activate)
 * POST /api/v1/auth/2fa/enable
 */
const enable = asyncHandler(async (req, res) => {
    const { secret, token, backupCodes } = req.body;

    await twoFactorService.enable2FA(req.user.id, secret, token, backupCodes);

    logger.auth('2FA_ENABLED', req.user.id);

    res.json({
        success: true,
        message: 'Two-factor authentication has been enabled successfully.',
    });
});

/**
 * Disable 2FA
 * POST /api/v1/auth/2fa/disable
 */
const disable = asyncHandler(async (req, res) => {
    const { token } = req.body;

    await twoFactorService.disable2FA(req.user.id, token);

    logger.auth('2FA_DISABLED', req.user.id);

    res.json({
        success: true,
        message: 'Two-factor authentication has been disabled.',
    });
});

/**
 * Verify 2FA code (for login completion)
 * POST /api/v1/auth/2fa/verify
 */
const verify = asyncHandler(async (req, res) => {
    const { token, tempToken } = req.body;

    // In a real implementation, tempToken would be a short-lived token
    // issued after password verification to identify the pending 2FA session

    // For now, we verify directly with the user's 2FA secret
    const user = req.user; // This would come from the temp session

    await twoFactorService.verify2FALogin(user, token);

    res.json({
        success: true,
        message: '2FA verification successful.',
    });
});

/**
 * Regenerate backup codes
 * POST /api/v1/auth/2fa/backup-codes
 */
const regenerateBackupCodes = asyncHandler(async (req, res) => {
    const { token } = req.body;

    const backupCodes = await twoFactorService.regenerateBackupCodes(req.user.id, token);

    res.json({
        success: true,
        message: 'New backup codes generated. Store them securely!',
        data: {
            backupCodes,
        },
    });
});

module.exports = {
    getStatus,
    setup,
    enable,
    disable,
    verify,
    regenerateBackupCodes,
};
