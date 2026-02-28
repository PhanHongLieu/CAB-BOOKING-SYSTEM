/**
 * Mock Prisma Client
 * ==================
 * 
 * Mock for database operations in tests.
 */

const mockPrismaClient = {
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
    },
    refreshToken: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    passwordHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
        deleteMany: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((callback) => callback(mockPrismaClient)),
    $queryRaw: jest.fn(),
};

// Reset all mocks
const resetMocks = () => {
    Object.values(mockPrismaClient.user).forEach(fn => fn.mockReset());
    Object.values(mockPrismaClient.refreshToken).forEach(fn => fn.mockReset());
    Object.values(mockPrismaClient.passwordHistory).forEach(fn => fn.mockReset());
    mockPrismaClient.$connect.mockReset();
    mockPrismaClient.$disconnect.mockReset();
    mockPrismaClient.$transaction.mockReset();
    mockPrismaClient.$queryRaw.mockReset();

    // Reset $transaction to default implementation
    mockPrismaClient.$transaction.mockImplementation((callback) => callback(mockPrismaClient));
};

module.exports = {
    prisma: mockPrismaClient,
    mockPrismaClient,
    resetMocks,
    connectDatabase: jest.fn().mockResolvedValue(true),
    disconnectDatabase: jest.fn().mockResolvedValue(true),
    checkDatabaseHealth: jest.fn().mockResolvedValue({ status: 'up', latency: 5 }),
};
