/**
 * Mock Redis Client
 * =================
 * 
 * Mock for Redis operations in tests.
 */

const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
};

// Store for simulating Redis data
const mockStore = new Map();

// Default implementations
mockRedisClient.get.mockImplementation((key) => {
    return Promise.resolve(mockStore.get(key) || null);
});

mockRedisClient.set.mockImplementation((key, value) => {
    mockStore.set(key, value);
    return Promise.resolve('OK');
});

mockRedisClient.setex.mockImplementation((key, ttl, value) => {
    mockStore.set(key, value);
    return Promise.resolve('OK');
});

mockRedisClient.del.mockImplementation((key) => {
    mockStore.delete(key);
    return Promise.resolve(1);
});

mockRedisClient.exists.mockImplementation((key) => {
    return Promise.resolve(mockStore.has(key) ? 1 : 0);
});

// Reset mocks
const resetMocks = () => {
    mockStore.clear();
    Object.values(mockRedisClient).forEach(fn => {
        if (typeof fn.mockClear === 'function') {
            fn.mockClear();
        }
    });
};

module.exports = {
    redis: mockRedisClient,
    mockRedisClient,
    mockStore,
    resetMocks,
    REDIS_KEYS: {
        TOKEN_BLACKLIST: 'blacklist:',
        RATE_LIMIT: 'rl:',
        SESSION: 'session:',
    },
    blacklistToken: jest.fn().mockResolvedValue(undefined),
    isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    setSession: jest.fn().mockResolvedValue(undefined),
    getSession: jest.fn().mockResolvedValue(null),
    deleteSession: jest.fn().mockResolvedValue(undefined),
    checkRedisHealth: jest.fn().mockResolvedValue({ status: 'up', latency: 2 }),
    closeRedis: jest.fn().mockResolvedValue(undefined),
};
