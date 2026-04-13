// Tạo chuyến đi mới - dùng trong thực tế với user đã được auth
exports.createRide = async (req, res, next) => {
  try {
    const { pickupLocation, dropoffLocation, bookingId, vehicleType } = req.body;
    const userId = req.user.userId;

    if (!pickupLocation || !dropoffLocation || !bookingId) {
      throw new ValidationError('pickupLocation, dropoffLocation, bookingId là bắt buộc');
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId) || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new ValidationError('bookingId hoặc userId không hợp lệ');
    }

    const ride = await Ride.create({
      bookingId,
      customerId: userId,
      pickupLocation,
      dropoffLocation,
      vehicleType: vehicleType || 'economy',
      status: 'created'
    });
    res.status(201).json({ success: true, data: ride });
  } catch (error) {
    next(error);
  }
};
const Ride = require('../models/Ride.model.js');
const mongoose = require('mongoose');
const path = require('path');
const { ValidationError, NotFoundError, UnauthorizedError } = require(path.resolve(__dirname, '../shared/errors.js'));
const logger = require(path.resolve(__dirname, '../shared/logger.js'));

let redisClient = null;

exports.setRedisClient = (client) => {
  redisClient = client;
};

// persist a single location update to ride document
exports.storeLocation = async (rideId, coords) => {
  if (!rideId) return;
  try {
    await Ride.findByIdAndUpdate(rideId, {
      currentLocation: coords,
      $push: { route: { ...coords, timestamp: new Date() } }
    });
  } catch (err) {
    logger.error('Failed to store ride location', err);
  }
};

exports.getRides = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { role } = req.user;
    const { status, page = 1, limit = 10 } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedError('Invalid user id');
    }

    const query = role === 'driver'
      ? { driverId: userId }
      : { customerId: userId };

    if (status) {
      query.status = status;
    }

    const rides = await Ride.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Ride.countDocuments(query);

    res.json({
      success: true,
      data: rides,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getRide = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { role } = req.user;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedError('Invalid user id');
    }

    const ride = await Ride.findById(id);
    if (!ride) throw new NotFoundError('Ride');

    const isCustomer = ride.customerId && ride.customerId.toString() === userId;
    const isDriver = ride.driverId && ride.driverId.toString() === userId;

    if (!isCustomer && !isDriver && role !== 'admin') {
      throw new NotFoundError('Ride');
    }

    res.json({ success: true, data: ride });
  } catch (error) {
    next(error);
  }
};

/**
 * GHI CHÚ DÀNH CHO DEV (KHÔNG DÙNG TRONG PROD):
 *
 * Các handler ở trên (createRide / getRides / getRide) đang chạy
 * đúng nghiệp vụ thực tế: luôn lấy user từ middleware authenticate
 * (JWT hợp lệ, userId là ObjectId thật) và kiểm tra quyền (customer/driver/admin).
 *
 * Nếu bạn muốn TEST NHANH ride-service mà chưa có auth-service hoặc booking-service,
 * nên kết hợp với bypass tạm thời trong auth.middleware.js và không sửa logic ở đây.
 *
 * Ví dụ ý tưởng test tạm (CHỈ THAM KHẢO, KHÔNG DÙNG TRỰC TIẾP):
 *
 * - Bypass auth, gán sẵn:
 *   req.user = { userId: '665f5c4d2f4e4b1234567890', role: 'customer' }
 * - Khi gọi POST /api/rides, truyền bookingId là một ObjectId hợp lệ bất kỳ
 *   (ví dụ sinh bằng mongosh hoặc copy từ booking thật).
 *
 * KHÔNG nên đưa lại kiểu 'test-user' hay bỏ kiểm tra ObjectId trong controller,
 * để tránh sai khác giữa môi trường test và môi trường thật.
 */
