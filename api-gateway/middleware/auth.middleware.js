const axios = require('axios');
const { UnauthorizedError } = require('../../shared/errors');

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new UnauthorizedError('Authentication token required'));
    }

    // Verify token with auth service
    const response = await axios.get(`${authServiceUrl}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.data.success) {
      throw new UnauthorizedError('Invalid token');
    }

    req.user = response.data.data.user;
    next();
  } catch (error) {
    if (error.response?.status === 401) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    next(error);
  }
};
