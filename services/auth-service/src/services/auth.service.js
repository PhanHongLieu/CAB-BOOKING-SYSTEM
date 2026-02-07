/**
 * Auth Service
 * ============
 * 
 * Core business logic for authentication operations.
 */

const { prisma } = require('../config/database.config');
const { blacklistToken } = require('../config/redis.config');
const {
    publishUserRegistered,
    publishUserLoggedIn,
    publishUserLoggedOut,
    publishPasswordChanged,
    publishFailedLogin,
    publishAccountLocked,
} = require('../config/rabbitmq.config');
const securityConfig = require('../config/security.config');
const bcryptUtil = require('../utils/bcrypt.util');
const jwtUtil = require('../utils/jwt.util');
const tokenService = require('./token.service');
const logger = require('../utils/logger.util');
const {
    DuplicateEmailError,
    DuplicatePhoneError,
    InvalidCredentialsError,
    AccountLockedError,
    UserNotFoundError,
    ValidationError,
    PasswordHistoryError,
} = require('../utils/errors.util');

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Promise<Object>} Created user info
 */
const register = async (userData) => {
    const { email, password, firstName, lastName, phoneNumber, role } = userData;

    // Check for existing email
    const existingEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });

    if (existingEmail) {
        throw new DuplicateEmailError('Email is already registered');
    }

    // Check for existing phone
    const existingPhone = await prisma.user.findUnique({
        where: { phoneNumber },
    });

    if (existingPhone) {
        throw new DuplicatePhoneError('Phone number is already registered');
    }

    // Hash password
    const hashedPassword = await bcryptUtil.hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = bcryptUtil.generateSecureToken();
    const hashedVerificationToken = bcryptUtil.hashToken(emailVerificationToken);
    const emailVerificationExpires = new Date(Date.now() + securityConfig.tokens.emailVerification.expiresIn);

    // Create user in transaction
    const user = await prisma.user.create({
        data: {
            email: email.toLowerCase(),
            password: hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            role,
            emailVerificationToken: hashedVerificationToken,
            emailVerificationExpires,
            passwordHistory: {
                create: {
                    password: hashedPassword,
                },
            },
        },
    });

    logger.auth('USER_REGISTERED', user.id, { email: user.email, role: user.role });

    // Publish event to message queue
    try {
        await publishUserRegistered(user);
    } catch (error) {
        logger.warn('Failed to publish USER_REGISTERED event:', error.message);
    }

    // TODO: Send verification email
    logger.info(`Email verification token for ${email}: ${emailVerificationToken}`);

    return {
        userId: user.id,
        email: user.email,
        verificationToken: emailVerificationToken, // Remove in production
    };
};

/**
 * Login user
 * @param {Object} loginData - Login credentials
 * @returns {Promise<Object>} Tokens and user info
 */
const login = async (loginData) => {
    const { email, password, twoFactorCode, clientIp } = loginData;

    // Find user by email
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });

    if (!user) {
        logger.security('LOGIN_FAILED_USER_NOT_FOUND', { email, ip: clientIp });
        throw new InvalidCredentialsError('Invalid email or password');
    }

    // Check if account is locked
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        logger.security('LOGIN_ATTEMPT_ON_LOCKED_ACCOUNT', {
            userId: user.id,
            email,
            lockedUntil: user.accountLockedUntil
        });
        throw new AccountLockedError(
            'Account is locked. Please try again later.',
            user.accountLockedUntil
        );
    }

    // Verify password
    const isPasswordValid = await bcryptUtil.comparePassword(password, user.password);

    if (!isPasswordValid) {
        // Increment failed login attempts
        const newFailedAttempts = user.failedLoginAttempts + 1;
        const maxAttempts = securityConfig.accountLockout.maxFailedAttempts;

        let updateData = {
            failedLoginAttempts: newFailedAttempts,
        };

        // Lock account if max attempts exceeded
        if (newFailedAttempts >= maxAttempts) {
            const lockDuration = securityConfig.accountLockout.lockoutDuration;
            updateData.accountLockedUntil = new Date(Date.now() + lockDuration);

            logger.security('ACCOUNT_LOCKED', {
                userId: user.id,
                email,
                attempts: newFailedAttempts,
                lockedUntil: updateData.accountLockedUntil,
            });

            // Publish account locked event
            try {
                await publishAccountLocked(user, 'Too many failed login attempts');
            } catch (error) {
                logger.warn('Failed to publish ACCOUNT_LOCKED event:', error.message);
            }
        }

        await prisma.user.update({
            where: { id: user.id },
            data: updateData,
        });

        // Publish failed login event
        try {
            await publishFailedLogin(email, clientIp, newFailedAttempts);
        } catch (error) {
            logger.warn('Failed to publish FAILED_LOGIN event:', error.message);
        }

        throw new InvalidCredentialsError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
        throw new InvalidCredentialsError('Account is deactivated');
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
            return {
                requires2FA: true,
                message: '2FA code required',
            };
        }
        // TODO: Verify 2FA code
        // const isValid2FA = verify2FACode(user.twoFactorSecret, twoFactorCode);
        // if (!isValid2FA) throw new InvalidCredentialsError('Invalid 2FA code');
    }

    // Reset failed login attempts on successful login
    await prisma.user.update({
        where: { id: user.id },
        data: {
            failedLoginAttempts: 0,
            accountLockedUntil: null,
            lastLogin: new Date(),
            lastLoginIP: clientIp,
        },
    });

    // Generate tokens
    const accessToken = jwtUtil.generateAccessToken(user);
    const refreshTokenData = jwtUtil.generateRefreshToken(user);

    // Store refresh token in database
    await tokenService.storeRefreshToken({
        token: refreshTokenData.token,
        userId: user.id,
        expiresAt: refreshTokenData.expiresAt,
        createdByIp: clientIp,
    });

    logger.auth('USER_LOGGED_IN', user.id, { email: user.email, ip: clientIp });

    // Publish login event
    try {
        await publishUserLoggedIn(user, clientIp);
    } catch (error) {
        logger.warn('Failed to publish USER_LOGGED_IN event:', error.message);
    }

    // Return user info without sensitive fields
    const userResponse = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        twoFactorEnabled: user.twoFactorEnabled,
    };

    return {
        accessToken,
        refreshToken: refreshTokenData.token,
        user: userResponse,
    };
};

/**
 * Logout user
 * @param {Object} logoutData - Logout data
 */
const logout = async (logoutData) => {
    const { accessToken, accessTokenPayload, refreshToken, userId, clientIp } = logoutData;

    // Blacklist access token in Redis
    if (accessToken && accessTokenPayload) {
        const tokenHash = jwtUtil.hashToken(accessToken);
        const ttl = jwtUtil.getTokenRemainingTTL(accessTokenPayload);

        if (ttl > 0) {
            await blacklistToken(tokenHash, userId, ttl);
        }
    }

    // Revoke refresh token if provided
    if (refreshToken) {
        await tokenService.revokeRefreshToken(refreshToken, clientIp);
    }

    // Publish logout event
    try {
        await publishUserLoggedOut(userId);
    } catch (error) {
        logger.warn('Failed to publish USER_LOGGED_OUT event:', error.message);
    }
};

/**
 * Request password reset
 * @param {string} email - User email
 */
const forgotPassword = async (email) => {
    const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
    });

    // Don't reveal if user exists
    if (!user) {
        logger.debug(`Password reset requested for non-existent email: ${email}`);
        return;
    }

    // Generate reset token
    const resetToken = bcryptUtil.generateSecureToken();
    const hashedToken = bcryptUtil.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + securityConfig.tokens.passwordReset.expiresIn);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            passwordResetToken: hashedToken,
            passwordResetExpires: expiresAt,
        },
    });

    logger.auth('PASSWORD_RESET_REQUESTED', user.id, { email });

    // TODO: Send password reset email
    logger.info(`Password reset token for ${email}: ${resetToken}`);
};

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} newPassword - New password
 */
const resetPassword = async (token, newPassword) => {
    const hashedToken = bcryptUtil.hashToken(token);

    const user = await prisma.user.findFirst({
        where: {
            passwordResetToken: hashedToken,
            passwordResetExpires: {
                gt: new Date(),
            },
        },
        include: {
            passwordHistory: {
                orderBy: { changedAt: 'desc' },
                take: securityConfig.password.historyCount,
            },
        },
    });

    if (!user) {
        throw new ValidationError('Invalid or expired password reset token');
    }

    // Check password history
    const historyPasswords = user.passwordHistory.map(h => h.password);
    const isInHistory = await bcryptUtil.isPasswordInHistory(newPassword, historyPasswords);

    if (isInHistory) {
        throw new PasswordHistoryError(`Cannot reuse any of your last ${securityConfig.password.historyCount} passwords`);
    }

    // Hash new password
    const hashedPassword = await bcryptUtil.hashPassword(newPassword);

    // Update user and add to password history
    await prisma.$transaction([
        prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
                passwordChangedAt: new Date(),
            },
        }),
        prisma.passwordHistory.create({
            data: {
                userId: user.id,
                password: hashedPassword,
            },
        }),
        // Revoke all refresh tokens
        prisma.refreshToken.updateMany({
            where: {
                userId: user.id,
                isActive: true,
            },
            data: {
                isActive: false,
                revokedAt: new Date(),
            },
        }),
    ]);

    logger.auth('PASSWORD_RESET_COMPLETED', user.id);

    // Publish event
    try {
        await publishPasswordChanged(user.id);
    } catch (error) {
        logger.warn('Failed to publish PASSWORD_CHANGED event:', error.message);
    }

    // TODO: Send confirmation email
};

/**
 * Change password (authenticated user)
 * @param {Object} changeData - Change password data
 */
const changePassword = async (changeData) => {
    const { userId, currentPassword, newPassword, keepCurrentToken } = changeData;

    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            passwordHistory: {
                orderBy: { changedAt: 'desc' },
                take: securityConfig.password.historyCount,
            },
        },
    });

    if (!user) {
        throw new UserNotFoundError('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcryptUtil.comparePassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
        throw new InvalidCredentialsError('Current password is incorrect');
    }

    // Check password history
    const historyPasswords = user.passwordHistory.map(h => h.password);
    const isInHistory = await bcryptUtil.isPasswordInHistory(newPassword, historyPasswords);

    if (isInHistory) {
        throw new PasswordHistoryError(`Cannot reuse any of your last ${securityConfig.password.historyCount} passwords`);
    }

    // Hash new password
    const hashedPassword = await bcryptUtil.hashPassword(newPassword);

    // Update password and revoke tokens
    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                passwordChangedAt: new Date(),
            },
        });

        await tx.passwordHistory.create({
            data: {
                userId,
                password: hashedPassword,
            },
        });

        // Revoke all refresh tokens except current one if specified
        if (keepCurrentToken) {
            await tx.refreshToken.updateMany({
                where: {
                    userId,
                    isActive: true,
                    token: { not: keepCurrentToken },
                },
                data: {
                    isActive: false,
                    revokedAt: new Date(),
                },
            });
        } else {
            await tx.refreshToken.updateMany({
                where: { userId, isActive: true },
                data: {
                    isActive: false,
                    revokedAt: new Date(),
                },
            });
        }
    });

    logger.auth('PASSWORD_CHANGED', userId);

    // Publish event
    try {
        await publishPasswordChanged(userId);
    } catch (error) {
        logger.warn('Failed to publish PASSWORD_CHANGED event:', error.message);
    }
};

/**
 * Verify email
 * @param {string} token - Verification token
 * @returns {Promise<Object>}
 */
const verifyEmail = async (token) => {
    const hashedToken = bcryptUtil.hashToken(token);

    const user = await prisma.user.findFirst({
        where: {
            emailVerificationToken: hashedToken,
            emailVerificationExpires: {
                gt: new Date(),
            },
        },
    });

    if (!user) {
        throw new ValidationError('Invalid or expired verification token');
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            isEmailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpires: null,
        },
    });

    logger.auth('EMAIL_VERIFIED', user.id);

    return { userId: user.id };
};

/**
 * Resend verification email
 * @param {string} userId - User ID
 */
const resendVerificationEmail = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });

    if (!user) {
        throw new UserNotFoundError('User not found');
    }

    if (user.isEmailVerified) {
        throw new ValidationError('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = bcryptUtil.generateSecureToken();
    const hashedToken = bcryptUtil.hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + securityConfig.tokens.emailVerification.expiresIn);

    await prisma.user.update({
        where: { id: userId },
        data: {
            emailVerificationToken: hashedToken,
            emailVerificationExpires: expiresAt,
        },
    });

    logger.auth('VERIFICATION_EMAIL_RESENT', userId);

    // TODO: Send verification email
    logger.info(`New verification token for ${user.email}: ${verificationToken}`);
};

module.exports = {
    register,
    login,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    verifyEmail,
    resendVerificationEmail,
};
