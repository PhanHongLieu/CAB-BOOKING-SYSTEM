const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { ValidationError, UnauthorizedError } = require('../../../shared/errors');
const logger = require('../../../shared/logger');
const { getEventBus } = require('../../../shared/eventBus');
const { recordEventPublished } = require('../../../shared/metrics');

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

const TEST_USERS = [
  {
    email: 'customer.review@test.local',
    password: '123456',
    name: 'Review Customer',
    phone: '0900000001',
    role: 'customer'
  },
  {
    email: 'driver.review@test.local',
    password: '123456',
    name: 'Review Driver',
    phone: '0900000002',
    role: 'driver'
  },
  {
    email: 'admin.review@test.local',
    password: '123456',
    name: 'Review Admin',
    phone: '0900000003',
    role: 'admin'
  }
];

exports.register = async (req, res, next) => {
  try {
    const { email, password, name, phone, role } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ValidationError('User with this email already exists');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name,
      phone,
      role: role || 'customer'
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    logger.info(`User registered: ${user.email}`);

    // Publish user.registered event (optional, for analytics)
    try {
      const eventBus = getEventBus();
      if (eventBus.isConnected) {
        await eventBus.publish('user.registered', {
          userId: user._id.toString(),
          email: user.email,
          role: user.role
        });
        recordEventPublished('user.registered', 'auth-service');
      }
    } catch (error) {
      logger.error('Error publishing user.registered event:', error);
      // Continue even if event publishing fails
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role
        },
        token: accessToken,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role
        },
        token: accessToken,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError('Refresh token is required');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);
    
    if (user) {
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('Token not provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password -refreshToken');
    
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid token');
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.seedReviewTestUsers = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedError('This endpoint is disabled in production');
    }

    const seededUsers = [];

    for (const testUser of TEST_USERS) {
      let user = await User.findOne({ email: testUser.email });

      if (!user) {
        user = await User.create(testUser);
      }

      const { accessToken, refreshToken } = generateTokens(user._id);
      user.refreshToken = refreshToken;
      await user.save({ validateBeforeSave: false });

      seededUsers.push({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role
        },
        login: {
          email: testUser.email,
          password: testUser.password
        },
        token: accessToken,
        accessToken,
        refreshToken
      });
    }

    res.json({
      success: true,
      data: seededUsers
    });
  } catch (error) {
    next(error);
  }
};
