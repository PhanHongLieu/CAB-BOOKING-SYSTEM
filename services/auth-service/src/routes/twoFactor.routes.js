/**
 * Two-Factor Authentication Routes
 * =================================
 * 
 * Routes for 2FA management.
 */

const express = require('express');
const router = express.Router();
const twoFactorController = require('../controllers/twoFactor.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body } = require('express-validator');
const { handleValidationErrors } = require('../utils/validators.util');

/**
 * @swagger
 * tags:
 *   name: Two-Factor Authentication
 *   description: 2FA management endpoints
 */

/**
 * @swagger
 * /api/v1/auth/2fa/status:
 *   get:
 *     summary: Get 2FA status
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 */
router.get('/status', authenticate, twoFactorController.getStatus);

/**
 * @swagger
 * /api/v1/auth/2fa/setup:
 *   post:
 *     summary: Setup 2FA - Generate secret and QR code
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     secret:
 *                       type: string
 *                       description: Base32 encoded secret
 *                     qrCodeUrl:
 *                       type: string
 *                       description: Data URL for QR code image
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post('/setup', authenticate, twoFactorController.setup);

/**
 * @swagger
 * /api/v1/auth/2fa/enable:
 *   post:
 *     summary: Enable 2FA after verifying setup
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - secret
 *               - token
 *               - backupCodes
 *             properties:
 *               secret:
 *                 type: string
 *                 description: The secret from setup
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code from authenticator app
 *               backupCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 *       400:
 *         description: Invalid verification code
 */
router.post(
    '/enable',
    authenticate,
    [
        body('secret').notEmpty().withMessage('Secret is required'),
        body('token')
            .notEmpty()
            .withMessage('Verification code is required')
            .isLength({ min: 6, max: 6 })
            .withMessage('Code must be 6 digits'),
        body('backupCodes')
            .isArray({ min: 1 })
            .withMessage('Backup codes are required'),
        handleValidationErrors,
    ],
    twoFactorController.enable
);

/**
 * @swagger
 * /api/v1/auth/2fa/disable:
 *   post:
 *     summary: Disable 2FA
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Current 2FA code to confirm disable
 *     responses:
 *       200:
 *         description: 2FA disabled successfully
 *       401:
 *         description: Invalid verification code
 */
router.post(
    '/disable',
    authenticate,
    [
        body('token')
            .notEmpty()
            .withMessage('Verification code is required')
            .isLength({ min: 6, max: 8 })
            .withMessage('Invalid code format'),
        handleValidationErrors,
    ],
    twoFactorController.disable
);

/**
 * @swagger
 * /api/v1/auth/2fa/verify:
 *   post:
 *     summary: Verify 2FA code during login
 *     tags: [Two-Factor Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - tempToken
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP code
 *               tempToken:
 *                 type: string
 *                 description: Temporary login token from password verification
 *     responses:
 *       200:
 *         description: 2FA verified, returns auth tokens
 *       401:
 *         description: Invalid 2FA code
 */
router.post(
    '/verify',
    [
        body('token')
            .notEmpty()
            .withMessage('Verification code is required')
            .isLength({ min: 6, max: 8 })
            .withMessage('Invalid code format'),
        body('tempToken')
            .notEmpty()
            .withMessage('Temporary token is required'),
        handleValidationErrors,
    ],
    twoFactorController.verify
);

/**
 * @swagger
 * /api/v1/auth/2fa/backup-codes:
 *   post:
 *     summary: Regenerate backup codes
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Current 2FA code to authorize regeneration
 *     responses:
 *       200:
 *         description: New backup codes generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     backupCodes:
 *                       type: array
 *                       items:
 *                         type: string
 */
router.post(
    '/backup-codes',
    authenticate,
    [
        body('token')
            .notEmpty()
            .withMessage('Verification code is required'),
        handleValidationErrors,
    ],
    twoFactorController.regenerateBackupCodes
);

module.exports = router;
