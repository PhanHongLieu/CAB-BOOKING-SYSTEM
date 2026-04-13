/**
 * Email Service Mock
 * ==================
 * 
 * Mock for email service in tests.
 */

module.exports = {
    sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordChangedNotification: jest.fn().mockResolvedValue(undefined),
    sendAccountLockedNotification: jest.fn().mockResolvedValue(undefined),
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    initializeTransporter: jest.fn(),
};
