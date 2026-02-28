/**
 * Auth Routes
 * ===========
 * 
 * Defines all authentication-related API endpoints.
 */

const express = require('express');
const router = express.Router();

// Controllers
const authController = require('../controllers/auth.controller');

// Middleware
const { authenticate } = require('../middleware/auth.middleware');
const { loginRateLimiter, passwordResetRateLimiter } = require('../middleware/rateLimiter.middleware');

// Validators
const {
    registerValidation,
    loginValidation,
    refreshTokenValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    changePasswordValidation,
    handleValidationErrors,
} = require('../utils/validators.util');

// Async handler
const asyncHandler = require('../utils/asyncHandler.util');

// ===========================================
// Public Routes (No Authentication Required)
// ===========================================

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email or phone already exists
 */
router.post(
    '/register',
    registerValidation,
    handleValidationErrors,
    asyncHandler(authController.register)
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       423:
 *         description: Account locked
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post(
    '/login',
    loginRateLimiter,
    loginValidation,
    handleValidationErrors,
    asyncHandler(authController.login)
);

/**
 * @swagger
 * /api/v1/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshTokenRequest'
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
    '/refresh-token',
    refreshTokenValidation,
    handleValidationErrors,
    asyncHandler(authController.refreshToken)
);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset email sent (if email exists)
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */
router.post(
    '/forgot-password',
    passwordResetRateLimiter,
    forgotPasswordValidation,
    handleValidationErrors,
    asyncHandler(authController.forgotPassword)
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Password]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post(
    '/reset-password',
    resetPasswordValidation,
    handleValidationErrors,
    asyncHandler(authController.resetPassword)
);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   get:
 *     summary: Verify email address
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired token
 */
router.get(
    '/verify-email',
    asyncHandler(authController.verifyEmail)
);

// ===========================================
// Protected Routes (Authentication Required)
// ===========================================

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
    '/logout',
    authenticate,
    asyncHandler(authController.logout)
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get(
    '/me',
    authenticate,
    asyncHandler(authController.getMe)
);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   post:
 *     summary: Change password
 *     tags: [Password]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Password validation failed
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
    '/change-password',
    authenticate,
    changePasswordValidation,
    handleValidationErrors,
    asyncHandler(authController.changePassword)
);

/**
 * @swagger
 * /api/v1/auth/resend-verification:
 *   post:
 *     summary: Resend email verification
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.post(
    '/resend-verification',
    authenticate,
    asyncHandler(authController.resendVerification)
);

module.exports = router;
