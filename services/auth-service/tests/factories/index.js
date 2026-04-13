/**
 * Test Factories
 * ==============
 * 
 * Factory functions for creating test data.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * Create a mock user object
 * @param {Object} overrides - Override default values
 * @returns {Object} User object
 */
const createMockUser = (overrides = {}) => {
    const id = overrides.id || uuidv4();
    const now = new Date();

    return {
        id,
        email: `user-${id.substring(0, 8)}@example.com`,
        password: '$2a$04$test.hashed.password.here', // Pre-hashed for test speed
        role: 'CUSTOMER',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        isEmailVerified: false,
        isPhoneVerified: false,
        isActive: true,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        lastLogin: null,
        lastLoginIP: null,
        failedLoginAttempts: 0,
        accountLockedUntil: null,
        passwordChangedAt: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        serviceId: null,
        allowedServices: [],
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
};

/**
 * Create a mock refresh token
 * @param {Object} overrides - Override default values
 * @returns {Object} RefreshToken object
 */
const createMockRefreshToken = (overrides = {}) => {
    const id = overrides.id || uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return {
        id,
        token: `hashed-token-${id}`,
        userId: overrides.userId || uuidv4(),
        expiresAt,
        createdByIp: '127.0.0.1',
        revokedAt: null,
        revokedByIp: null,
        replacedByToken: null,
        isActive: true,
        lastUsedAt: null,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
};

/**
 * Create a mock password history entry
 * @param {Object} overrides - Override default values
 * @returns {Object} PasswordHistory object
 */
const createMockPasswordHistory = (overrides = {}) => {
    return {
        id: overrides.id || uuidv4(),
        userId: overrides.userId || uuidv4(),
        password: '$2a$04$old.hashed.password.here',
        changedAt: new Date(),
        ...overrides,
    };
};

/**
 * Create a registration request body
 * @param {Object} overrides - Override default values
 * @returns {Object} Registration request body
 */
const createRegistrationRequest = (overrides = {}) => {
    const random = Math.floor(Math.random() * 100000);

    return {
        email: `test${random}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        role: 'CUSTOMER',
        ...overrides,
    };
};

/**
 * Create a login request body
 * @param {Object} overrides - Override default values
 * @returns {Object} Login request body
 */
const createLoginRequest = (overrides = {}) => {
    return {
        email: 'test@example.com',
        password: 'TestPassword123!',
        ...overrides,
    };
};

/**
 * Hash a password synchronously for tests
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
const hashPasswordSync = (password) => {
    return bcrypt.hashSync(password, 4); // Low rounds for test speed
};

module.exports = {
    createMockUser,
    createMockRefreshToken,
    createMockPasswordHistory,
    createRegistrationRequest,
    createLoginRequest,
    hashPasswordSync,
};
