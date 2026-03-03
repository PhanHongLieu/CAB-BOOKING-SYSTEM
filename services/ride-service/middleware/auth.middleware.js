const path = require('path');
const HttpClient = require(path.resolve(__dirname, '../shared/httpClient.js'));
const { UnauthorizedError } = require(path.resolve(__dirname, '../shared/errors.js'));

const authClient = new HttpClient(process.env.AUTH_SERVICE_URL || 'http://localhost:3001');


// Muốn test thì mở comment hàm authenticate thật, đóng comment hàm authenticate bypass này.....

//  exports.authenticate = (req, res, next) => {
//    // Bỏ qua xác thực, gán cứng 1 user giả lập
//    req.user = {
//       userId: '665f5c4d2f4e4b1234567890', // ObjectId hợp lệ (ví dụ)
//       email: 'test@example.com',
//       role: 'customer'
//     };
//     next();
//   };

// Xác thực thật với Auth Service (dùng trong môi trường thực tế)
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedError('Authentication token required');
    }

    // Verify token with auth service
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

/**
 * GHI CHÚ DÀNH CHO DEV (KHÔNG DÙNG TRONG PROD):
 *
 * Nếu cần test nhanh ride-service mà chưa chạy auth-service,
 * bạn có thể tạm THAY thế hàm authenticate ở trên bằng đoạn code bên dưới.
 * NHỚ ĐỔI LẠI authenticate THẬT TRƯỚC KHI COMMIT/DEPLOY.
 *
 * Ví dụ bypass:
 *
 * exports.authenticate = (req, res, next) => {
 *   // Bỏ qua xác thực, gán cứng 1 user giả lập
 *   req.user = {
 *     userId: '665f5c4d2f4e4b1234567890', // ObjectId hợp lệ (ví dụ)
 *     email: 'test@example.com',
 *     role: 'customer'
 *   };
 *   next();
 * };
 */