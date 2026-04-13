/**
 * Security Configuration
 * ======================
 * 
 * Centralized security configuration for the Auth Service.
 * Contains settings for JWT, passwords, rate limiting, and account lockout.
 */

const securityConfig = {
    // JWT Configuration
    jwt: {
        accessToken: {
            secret: process.env.JWT_ACCESS_SECRET || 'your-super-secret-access-key-change-in-production',
            expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
            algorithm: 'HS256',
        },
        refreshToken: {
            secret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-in-production',
            expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
            rotation: true,
            reuseDetection: true,
        },
    },

    // Password Security
    password: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChar: true,
        historyCount: parseInt(process.env.PASSWORD_HISTORY_COUNT, 10) || 5,
        expiryDays: 90, // Optional: Force password change every 90 days
        specialChars: '!@#$%^&*(),.?":{}|<>',
    },

    // Rate Limiting Configuration
    rateLimiting: {
        login: {
            windowMs: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW, 10) || 900000, // 15 minutes
            max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 5,
            skipSuccessfulRequests: true,
        },
        api: {
            windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW, 10) || 900000, // 15 minutes
            max: parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 100,
        },
        passwordReset: {
            windowMs: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW, 10) || 3600000, // 1 hour
            max: parseInt(process.env.PASSWORD_RESET_RATE_LIMIT_MAX, 10) || 3,
        },
    },

    // Account Lockout Policy
    accountLockout: {
        maxFailedAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS, 10) || 5,
        lockoutDuration: parseInt(process.env.ACCOUNT_LOCKOUT_DURATION, 10) || 3600000, // 1 hour in ms
        notifyOnLock: true,
    },

    // CORS Configuration
    cors: {
        origin: process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',')
            : ['http://localhost:3000'],
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Service-Id', 'X-Service-Secret', 'X-Service-Token'],
    },

    // Helmet Configuration (Security Headers)
    helmet: {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", 'data:', 'https:'],
            },
        },
        crossOriginEmbedderPolicy: false,
    },

    // Token Configuration
    tokens: {
        emailVerification: {
            expiresIn: 24 * 60 * 60 * 1000, // 24 hours in ms
            length: 32, // bytes
        },
        passwordReset: {
            expiresIn: 60 * 60 * 1000, // 1 hour in ms
            length: 32, // bytes
        },
    },
};

module.exports = securityConfig;
