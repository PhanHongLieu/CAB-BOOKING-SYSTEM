/**
 * Auth Controller
 * ===============
 * 
 * Handles all authentication-related HTTP requests.
 */

const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');
const logger = require('../utils/logger.util');

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = async (req, res) => {
    const { email, password, firstName, lastName, phoneNumber, role } = req.body;

    const result = await authService.register({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        role: role || 'CUSTOMER',
    });

    logger.auth('USER_REGISTERED', result.userId, { email });

    res.status(201).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
        data: {
            userId: result.userId,
        },
    });
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = async (req, res) => {
    const { email, password, twoFactorCode } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    const result = await authService.login({
        email,
        password,
        twoFactorCode,
        clientIp,
    });

    logger.auth('USER_LOGGED_IN', result.user.id, { email, ip: clientIp });

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
        },
    });
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = async (req, res) => {
    const { refreshToken: token } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    const result = await tokenService.refreshTokens(token, clientIp);

    res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
        },
    });
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
    const { refreshToken } = req.body;
    const accessToken = req.token;
    const accessTokenPayload = req.tokenPayload;
    const userId = req.user.id;
    const clientIp = req.ip || req.connection.remoteAddress;

    await authService.logout({
        accessToken,
        accessTokenPayload,
        refreshToken,
        userId,
        clientIp,
    });

    logger.auth('USER_LOGGED_OUT', userId);

    res.status(200).json({
        success: true,
        message: 'Logout successful',
    });
};

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
const getMe = async (req, res) => {
    const user = req.user;

    res.status(200).json({
        success: true,
        data: {
            user,
        },
    });
};

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
    const { email } = req.body;

    await authService.forgotPassword(email);

    // Always return success to prevent email enumeration
    res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
    });
};

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    await authService.resetPassword(token, newPassword);

    res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. Please login with your new password.',
    });
};

/**
 * Change password (authenticated)
 * POST /api/v1/auth/change-password
 */
const changePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const currentRefreshToken = req.body.refreshToken; // Optional: current refresh token to keep

    await authService.changePassword({
        userId,
        currentPassword,
        newPassword,
        keepCurrentToken: currentRefreshToken,
    });

    logger.auth('PASSWORD_CHANGED', userId);

    res.status(200).json({
        success: true,
        message: 'Password changed successfully.',
    });
};

/**
 * Verify email
 * GET /api/v1/auth/verify-email?token=xxx
 */
const verifyEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Verification token is required',
            },
        });
    }

    const result = await authService.verifyEmail(token);

    res.status(200).json({
        success: true,
        message: 'Email verified successfully.',
        data: {
            userId: result.userId,
        },
    });
};

/**
 * Resend verification email
 * POST /api/v1/auth/resend-verification
 */
const resendVerification = async (req, res) => {
    const userId = req.user.id;

    await authService.resendVerificationEmail(userId);

    res.status(200).json({
        success: true,
        message: 'Verification email has been sent.',
    });
};

module.exports = {
    register,
    login,
    refreshToken,
    logout,
    getMe,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyEmail,
    resendVerification,
};
