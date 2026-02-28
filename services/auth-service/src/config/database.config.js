/**
 * PostgreSQL Database Configuration with Prisma
 * ==============================================
 * 
 * This module provides the Prisma client instance for database operations.
 * Uses connection pooling and handles graceful shutdown.
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger.util');

// Create Prisma client instance with logging
const prisma = new PrismaClient({
    log: [
        { level: 'query', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
    ],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
        logger.debug(`Query: ${e.query}`);
        logger.debug(`Params: ${e.params}`);
        logger.debug(`Duration: ${e.duration}ms`);
    });
}

// Log warnings and errors
prisma.$on('warn', (e) => {
    logger.warn(`Prisma Warning: ${e.message}`);
});

prisma.$on('error', (e) => {
    logger.error(`Prisma Error: ${e.message}`);
});

/**
 * Connect to the database
 * @returns {Promise<void>}
 */
const connectDatabase = async () => {
    try {
        await prisma.$connect();
        logger.info('✅ PostgreSQL connected successfully via Prisma');
        return true;
    } catch (error) {
        logger.error('❌ PostgreSQL connection failed:', error.message);
        throw error;
    }
};

/**
 * Disconnect from the database
 * @returns {Promise<void>}
 */
const disconnectDatabase = async () => {
    try {
        await prisma.$disconnect();
        logger.info('PostgreSQL disconnected');
    } catch (error) {
        logger.error('Error disconnecting from PostgreSQL:', error.message);
    }
};

/**
 * Health check for database connection
 * @returns {Promise<Object>}
 */
const checkDatabaseHealth = async () => {
    const startTime = Date.now();
    try {
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - startTime;
        return {
            status: 'up',
            latency,
        };
    } catch (error) {
        return {
            status: 'down',
            error: error.message,
        };
    }
};

module.exports = {
    prisma,
    connectDatabase,
    disconnectDatabase,
    checkDatabaseHealth,
};
