/**
 * Winston Logger Configuration
 * ============================
 * 
 * Centralized logging with Winston for the Auth Service.
 * Supports multiple transports and log levels.
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define level based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : (process.env.LOG_LEVEL || 'info');
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
        const { timestamp, level, message, stack, ...metadata } = info;
        let log = `${timestamp} [${level.toUpperCase()}] [auth-service]: ${message}`;

        // Add metadata if present
        if (Object.keys(metadata).length > 0) {
            log += ` ${JSON.stringify(metadata)}`;
        }

        // Add stack trace for errors
        if (stack) {
            log += `\n${stack}`;
        }

        return log;
    })
);

// Console format with colors
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    format
);

// JSON format for production
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Define transports
const transports = [
    // Console transport
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
    }),
];

// Add file transports in production
if (process.env.NODE_ENV === 'production') {
    const logDir = process.env.LOG_DIR || 'logs';

    // Error log file
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: jsonFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );

    // Combined log file
    transports.push(
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: jsonFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    );
}

// Create logger instance
const logger = winston.createLogger({
    level: level(),
    levels,
    format,
    transports,
    defaultMeta: { service: 'auth-service' },
});

// Stream for Morgan HTTP logging
logger.stream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

/**
 * Log security event
 * @param {string} event - Event type
 * @param {Object} data - Event data
 */
logger.security = (event, data) => {
    logger.warn(`[SECURITY] ${event}`, {
        ...data,
        type: 'security_event',
    });
};

/**
 * Log authentication event
 * @param {string} action - Action type
 * @param {string} userId - User ID
 * @param {Object} details - Additional details
 */
logger.auth = (action, userId, details = {}) => {
    logger.info(`[AUTH] ${action}`, {
        userId,
        ...details,
        type: 'auth_event',
    });
};

/**
 * Log database event
 * @param {string} operation - Database operation
 * @param {Object} details - Operation details
 */
logger.db = (operation, details = {}) => {
    logger.debug(`[DB] ${operation}`, {
        ...details,
        type: 'db_event',
    });
};

module.exports = logger;
