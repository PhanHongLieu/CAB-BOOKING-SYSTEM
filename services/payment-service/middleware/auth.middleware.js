const HttpClient = require('../../shared/httpClient');
const { UnauthorizedError } = require('../../shared/errors');

const authClient = new HttpClient(process.env.AUTH_SERVICE_URL || 'http://localhost:3001');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token required');
    }

    authClient.setAuthToken(token);
    const response = await authClient.get('/api/auth/verify');
    
    if (!response.success) {
      throw new UnauthorizedError('Invalid token');
    }

    req.user = {
      userId: response.data.user.id,
      email: response.data.user.email,
      role: response.data.user.role
    };
    
    next();
  } catch (error) {
    if (error.response?.status === 401) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    next(error);
  }
};
