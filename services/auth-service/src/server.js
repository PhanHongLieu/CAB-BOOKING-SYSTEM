/**
 * Auth Service - Main Server
 * ==========================
 * 
 * Entry point for the Authentication Service.
 * Cab Booking System - Microservices Architecture
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

// Local imports
const logger = require('./utils/logger.util');
const securityConfig = require('./config/security.config');
const { connectDatabase, disconnectDatabase, checkDatabaseHealth } = require('./config/database.config');
const { checkRedisHealth, closeRedis } = require('./config/redis.config');
const { connectRabbitMQ, checkRabbitMQHealth, closeRabbitMQ } = require('./config/rabbitmq.config');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler.middleware');
const { apiRateLimiter } = require('./middleware/rateLimiter.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
const twoFactorRoutes = require('./routes/twoFactor.routes');
const simpleAuthRoutes = require('./routes/simpleAuth.routes');

// Swagger documentation
const swaggerSpecs = require('./swagger');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;
const SERVICE_NAME = process.env.SERVICE_NAME || 'auth-service';
const SIMPLE_AUTH_MODE = process.env.SIMPLE_AUTH_MODE === 'true';

// ===========================================
// Security Middleware
// ===========================================

// Helmet security headers
app.use(helmet(securityConfig.helmet));

// CORS configuration
app.use(cors(securityConfig.cors));

// ===========================================
// Body Parsers
// ===========================================

app.use(express.json({ limit: '10kb' })); // Limit body size for security
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ===========================================
// Request Logging
// ===========================================

app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`, {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });
    });

    next();
});

// ===========================================
// Health Check Endpoint
// ===========================================

app.get('/health', async (req, res) => {
    const startTime = Date.now();

    try {
        if (SIMPLE_AUTH_MODE) {
            return res.status(200).json({
                status: 'healthy',
                mode: 'simple-auth',
                service: SERVICE_NAME,
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                responseTime: Date.now() - startTime,
            });
        }

        // Check all service dependencies
        const [dbHealth, redisHealth, rabbitHealth] = await Promise.all([
            checkDatabaseHealth(),
            checkRedisHealth(),
            checkRabbitMQHealth(),
        ]);

        const allHealthy =
            dbHealth.status === 'up' &&
            redisHealth.status === 'up' &&
            rabbitHealth.status === 'up';

        const status = allHealthy ? 'healthy' : 'degraded';
        const httpStatus = allHealthy ? 200 : 503;

        res.status(httpStatus).json({
            status,
            service: SERVICE_NAME,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            responseTime: Date.now() - startTime,
            services: {
                postgresql: dbHealth,
                redis: redisHealth,
                rabbitmq: rabbitHealth,
            },
        });
    } catch (error) {
        logger.error('Health check failed:', error.message);
        res.status(500).json({
            status: 'unhealthy',
            service: SERVICE_NAME,
            timestamp: new Date().toISOString(),
            error: error.message,
        });
    }
});

// Simple liveness probe
app.get('/live', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Simple readiness probe
app.get('/ready', async (req, res) => {
    try {
        const dbHealth = await checkDatabaseHealth();
        if (dbHealth.status === 'up') {
            res.status(200).json({ status: 'ready' });
        } else {
            res.status(503).json({ status: 'not ready' });
        }
    } catch (error) {
        res.status(503).json({ status: 'not ready' });
    }
});

// ===========================================
// API Routes
// ===========================================

// Apply general rate limiter to all API routes
app.use('/api', apiRateLimiter);

if (SIMPLE_AUTH_MODE) {
    app.use('/api/auth', simpleAuthRoutes);
    app.use('/api/v1/auth', simpleAuthRoutes);
    app.use('/api', simpleAuthRoutes);
}

// Auth routes
app.use('/api/v1/auth', authRoutes);

// 2FA routes
app.use('/api/v1/auth/2fa', twoFactorRoutes);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Auth Service API Documentation',
}));

// ===========================================
// Error Handling
// ===========================================

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ===========================================
// Server Startup
// ===========================================

const startServer = async () => {
    try {
        logger.info(`Starting ${SERVICE_NAME}...`);

        if (SIMPLE_AUTH_MODE) {
            logger.warn('SIMPLE_AUTH_MODE=true. Running without PostgreSQL/Redis/RabbitMQ.');
        } else {
            // Connect to PostgreSQL
            await connectDatabase();

            // Connect to RabbitMQ (optional - continues if fails)
            try {
                await connectRabbitMQ();
            } catch (error) {
                logger.warn('RabbitMQ connection failed, continuing without message queue:', error.message);
            }
        }

        // Start HTTP server
        const server = app.listen(PORT, () => {
            logger.info(`✅ ${SERVICE_NAME} running on port ${PORT}`);
            logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
            logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
        });

        // Graceful shutdown handlers
        const gracefulShutdown = async (signal) => {
            logger.info(`${signal} received. Starting graceful shutdown...`);

            // Stop accepting new connections
            server.close(async () => {
                logger.info('HTTP server closed');

                try {
                    // Close database connection
                    await disconnectDatabase();

                    // Close Redis connection
                    await closeRedis();

                    // Close RabbitMQ connection
                    await closeRabbitMQ();

                    logger.info('All connections closed. Exiting...');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown:', error.message);
                    process.exit(1);
                }
            });

            // Force shutdown after 30 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 30000);
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
startServer();

module.exports = app;
