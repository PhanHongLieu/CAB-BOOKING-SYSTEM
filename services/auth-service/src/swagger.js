/**
 * Swagger API Documentation Configuration
 * ========================================
 * 
 * Configures swagger-jsdoc for API documentation.
 */

const swaggerJsdoc = require('swagger-jsdoc');

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Auth Service API',
        version: '1.0.0',
        description: `
      Authentication and Authorization Service for Cab Booking System.
      
      ## Features
      - User Registration & Login
      - JWT Token Management (Access & Refresh)
      - Password Management (Reset, Change)
      - Role-based Access Control
      - Rate Limiting
      - Account Lockout Protection
      
      ## Security
      - bcrypt password hashing (12 rounds)
      - Short-lived access tokens (15 min)
      - Refresh token rotation
      - Token blacklisting via Redis
    `,
        contact: {
            name: 'Cab Booking Team',
            email: 'support@cabsystem.com',
        },
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
        },
    },
    servers: [
        {
            url: 'http://localhost:3001',
            description: 'Development server',
        },
        {
            url: 'https://api.cabsystem.com',
            description: 'Production server',
        },
    ],
    tags: [
        {
            name: 'Authentication',
            description: 'User authentication endpoints',
        },
        {
            name: 'Password',
            description: 'Password management endpoints',
        },
        {
            name: 'User',
            description: 'User profile endpoints',
        },
        {
            name: 'Service-to-Service',
            description: 'Internal service authentication',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your access token',
            },
        },
        schemas: {
            // User schemas
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    phoneNumber: { type: 'string' },
                    role: { type: 'string', enum: ['CUSTOMER', 'DRIVER', 'ADMIN', 'SERVICE'] },
                    isEmailVerified: { type: 'boolean' },
                    isPhoneVerified: { type: 'boolean' },
                    isActive: { type: 'boolean' },
                    twoFactorEnabled: { type: 'boolean' },
                    createdAt: { type: 'string', format: 'date-time' },
                },
            },

            // Request schemas
            RegisterRequest: {
                type: 'object',
                required: ['email', 'password', 'firstName', 'lastName', 'phoneNumber'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', minLength: 8, example: 'Password123!' },
                    firstName: { type: 'string', example: 'John' },
                    lastName: { type: 'string', example: 'Doe' },
                    phoneNumber: { type: 'string', example: '+1234567890' },
                    role: { type: 'string', enum: ['CUSTOMER', 'DRIVER'], default: 'CUSTOMER' },
                },
            },
            LoginRequest: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                    email: { type: 'string', format: 'email', example: 'user@example.com' },
                    password: { type: 'string', example: 'Password123!' },
                    twoFactorCode: { type: 'string', example: '123456' },
                },
            },
            RefreshTokenRequest: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                    refreshToken: { type: 'string' },
                },
            },
            ForgotPasswordRequest: {
                type: 'object',
                required: ['email'],
                properties: {
                    email: { type: 'string', format: 'email' },
                },
            },
            ResetPasswordRequest: {
                type: 'object',
                required: ['token', 'newPassword'],
                properties: {
                    token: { type: 'string' },
                    newPassword: { type: 'string', minLength: 8 },
                },
            },
            ChangePasswordRequest: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                    currentPassword: { type: 'string' },
                    newPassword: { type: 'string', minLength: 8 },
                },
            },

            // Response schemas
            SuccessResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { type: 'object' },
                },
            },
            AuthResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: {
                        type: 'object',
                        properties: {
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                            user: { $ref: '#/components/schemas/User' },
                        },
                    },
                },
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    error: {
                        type: 'object',
                        properties: {
                            code: { type: 'string' },
                            message: { type: 'string' },
                            details: { type: 'array', items: { type: 'object' } },
                            timestamp: { type: 'string', format: 'date-time' },
                        },
                    },
                },
            },
        },
        responses: {
            UnauthorizedError: {
                description: 'Access token is missing or invalid',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' },
                    },
                },
            },
            ForbiddenError: {
                description: 'Access denied',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' },
                    },
                },
            },
            ValidationError: {
                description: 'Validation failed',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' },
                    },
                },
            },
            TooManyRequests: {
                description: 'Rate limit exceeded',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' },
                    },
                },
            },
        },
    },
};

const options = {
    swaggerDefinition,
    apis: [
        './src/routes/*.js',
        './src/controllers/*.js',
    ],
};

const swaggerSpecs = swaggerJsdoc(options);

module.exports = swaggerSpecs;
