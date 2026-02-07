/**
 * RabbitMQ Configuration
 * ======================
 * 
 * Handles message queue connection and event publishing
 * for the Auth Service in the Cab Booking System.
 */

const amqp = require('amqplib');
const logger = require('../utils/logger.util');

// RabbitMQ configuration
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE || 'cab_booking_events';
const EXCHANGE_TYPE = 'topic';

let connection = null;
let channel = null;

/**
 * Event routing keys for Auth Service
 */
const AUTH_EVENTS = {
    USER_REGISTERED: 'user.registered',
    USER_LOGGED_IN: 'user.logged_in',
    USER_LOGGED_OUT: 'user.logged_out',
    USER_EMAIL_VERIFIED: 'user.email_verified',
    PASSWORD_CHANGED: 'user.password_changed',
    PASSWORD_RESET_REQUESTED: 'user.password_reset_requested',
    PASSWORD_RESET_COMPLETED: 'user.password_reset_completed',
    SECURITY_FAILED_LOGIN: 'security.failed_login',
    SECURITY_ACCOUNT_LOCKED: 'security.account_locked',
    SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
};

/**
 * Connect to RabbitMQ
 * @returns {Promise<Object>} Channel object
 */
const connectRabbitMQ = async () => {
    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        // Assert the exchange
        await channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, {
            durable: true,
        });

        logger.info(`✅ RabbitMQ connected successfully (Exchange: ${EXCHANGE_NAME})`);

        // Handle connection errors
        connection.on('error', (err) => {
            logger.error('RabbitMQ connection error:', err.message);
        });

        connection.on('close', () => {
            logger.warn('RabbitMQ connection closed');
        });

        return channel;
    } catch (error) {
        logger.error('❌ RabbitMQ connection failed:', error.message);
        throw error;
    }
};

/**
 * Publish an event to the message queue
 * @param {string} routingKey - Event routing key
 * @param {Object} payload - Event payload
 * @returns {Promise<boolean>}
 */
const publishEvent = async (routingKey, payload) => {
    try {
        if (!channel) {
            logger.warn('RabbitMQ channel not available, attempting to reconnect...');
            await connectRabbitMQ();
        }

        const message = {
            ...payload,
            timestamp: new Date().toISOString(),
            service: 'auth-service',
        };

        const success = channel.publish(
            EXCHANGE_NAME,
            routingKey,
            Buffer.from(JSON.stringify(message)),
            {
                persistent: true,
                contentType: 'application/json',
            }
        );

        if (success) {
            logger.debug(`Event published: ${routingKey}`, { payload: message });
        } else {
            logger.warn(`Failed to publish event: ${routingKey}`);
        }

        return success;
    } catch (error) {
        logger.error(`Error publishing event ${routingKey}:`, error.message);
        return false;
    }
};

/**
 * Publish user registered event
 * @param {Object} user - User data
 */
const publishUserRegistered = async (user) => {
    return publishEvent(AUTH_EVENTS.USER_REGISTERED, {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
    });
};

/**
 * Publish user logged in event
 * @param {Object} user - User data
 * @param {string} ip - Client IP address
 */
const publishUserLoggedIn = async (user, ip) => {
    return publishEvent(AUTH_EVENTS.USER_LOGGED_IN, {
        userId: user.id,
        email: user.email,
        ip,
    });
};

/**
 * Publish user logged out event
 * @param {string} userId - User ID
 */
const publishUserLoggedOut = async (userId) => {
    return publishEvent(AUTH_EVENTS.USER_LOGGED_OUT, {
        userId,
    });
};

/**
 * Publish password changed event
 * @param {string} userId - User ID
 */
const publishPasswordChanged = async (userId) => {
    return publishEvent(AUTH_EVENTS.PASSWORD_CHANGED, {
        userId,
    });
};

/**
 * Publish failed login event
 * @param {string} email - User email
 * @param {string} ip - Client IP address
 * @param {number} attempts - Failed attempt count
 */
const publishFailedLogin = async (email, ip, attempts) => {
    return publishEvent(AUTH_EVENTS.SECURITY_FAILED_LOGIN, {
        email,
        ip,
        attempts,
    });
};

/**
 * Publish account locked event
 * @param {Object} user - User data
 * @param {string} reason - Lock reason
 */
const publishAccountLocked = async (user, reason) => {
    return publishEvent(AUTH_EVENTS.SECURITY_ACCOUNT_LOCKED, {
        userId: user.id,
        email: user.email,
        reason,
    });
};

/**
 * Health check for RabbitMQ connection
 * @returns {Promise<Object>}
 */
const checkRabbitMQHealth = async () => {
    const startTime = Date.now();
    try {
        if (connection && channel) {
            // Check if channel is open
            await channel.checkExchange(EXCHANGE_NAME);
            const latency = Date.now() - startTime;
            return {
                status: 'up',
                latency,
            };
        }
        return {
            status: 'down',
            error: 'Not connected',
        };
    } catch (error) {
        return {
            status: 'down',
            error: error.message,
        };
    }
};

/**
 * Close RabbitMQ connection gracefully
 */
const closeRabbitMQ = async () => {
    try {
        if (channel) {
            await channel.close();
        }
        if (connection) {
            await connection.close();
        }
        logger.info('RabbitMQ connection closed gracefully');
    } catch (error) {
        logger.error('Error closing RabbitMQ connection:', error.message);
    }
};

module.exports = {
    connectRabbitMQ,
    publishEvent,
    publishUserRegistered,
    publishUserLoggedIn,
    publishUserLoggedOut,
    publishPasswordChanged,
    publishFailedLogin,
    publishAccountLocked,
    checkRabbitMQHealth,
    closeRabbitMQ,
    AUTH_EVENTS,
};
