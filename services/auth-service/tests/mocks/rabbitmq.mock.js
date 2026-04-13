/**
 * Mock RabbitMQ
 * =============
 * 
 * Mock for RabbitMQ operations in tests.
 */

module.exports = {
    connectRabbitMQ: jest.fn().mockResolvedValue({}),
    publishEvent: jest.fn().mockResolvedValue(true),
    publishUserRegistered: jest.fn().mockResolvedValue(true),
    publishUserLoggedIn: jest.fn().mockResolvedValue(true),
    publishUserLoggedOut: jest.fn().mockResolvedValue(true),
    publishPasswordChanged: jest.fn().mockResolvedValue(true),
    publishFailedLogin: jest.fn().mockResolvedValue(true),
    publishAccountLocked: jest.fn().mockResolvedValue(true),
    checkRabbitMQHealth: jest.fn().mockResolvedValue({ status: 'up', latency: 8 }),
    closeRabbitMQ: jest.fn().mockResolvedValue(undefined),
    AUTH_EVENTS: {
        USER_REGISTERED: 'user.registered',
        USER_LOGGED_IN: 'user.logged_in',
        USER_LOGGED_OUT: 'user.logged_out',
        PASSWORD_CHANGED: 'user.password_changed',
        SECURITY_FAILED_LOGIN: 'security.failed_login',
        SECURITY_ACCOUNT_LOCKED: 'security.account_locked',
    },
};
