/**
 * Two-Factor Service Mock
 * =======================
 * 
 * Mock for 2FA service in tests.
 */

module.exports = {
    generateSecret: jest.fn().mockResolvedValue({
        secret: 'MOCK_SECRET_BASE32',
        otpauthUrl: 'otpauth://totp/MockApp:test@example.com?secret=MOCK_SECRET_BASE32',
        qrCodeUrl: 'data:image/png;base64,mockQRCode',
        backupCodes: ['AAAA1111', 'BBBB2222', 'CCCC3333'],
    }),
    generateBackupCodes: jest.fn().mockReturnValue(['AAAA1111', 'BBBB2222', 'CCCC3333']),
    verifyToken: jest.fn().mockReturnValue(true),
    enable2FA: jest.fn().mockResolvedValue(true),
    disable2FA: jest.fn().mockResolvedValue(true),
    verify2FALogin: jest.fn().mockResolvedValue(true),
    get2FAStatus: jest.fn().mockResolvedValue({ enabled: false }),
    regenerateBackupCodes: jest.fn().mockResolvedValue(['DDDD4444', 'EEEE5555', 'FFFF6666']),
};
