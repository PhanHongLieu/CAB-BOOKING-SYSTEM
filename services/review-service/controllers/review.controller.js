const HttpClient = require('../../../shared/httpClient');
const { ForbiddenError, NotFoundError, ValidationError } = require('../../../shared/errors');
const logger = require('../../../shared/logger');
const Review = require('../models/review.model');

const bookingClient = new HttpClient(process.env.BOOKING_SERVICE_URL || 'http://localhost:3002');

function extractId(field) {
  if (!field) return null;
  if (typeof field === 'string') return field;
  return field._id || field.id || null;
}

exports.createReview = async (req, res, next) => {
  try {
    const reviewerId = req.user.userId;
    const { bookingId, revieweeId, rating, comment } = req.body;

    if (!bookingId) {
      throw new ValidationError('bookingId is required');
    }

    const score = Number(rating);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new ValidationError('rating must be an integer from 1 to 5');
    }

    const existingReview = await Review.getReviewByBookingId(bookingId);
    if (existingReview) {
      throw new ValidationError('Review already exists for this booking');
    }

    const booking = await bookingClient.get(`/api/bookings/${bookingId}`, {
      headers: { Authorization: req.headers.authorization }
    });

    if (!booking?.success || !booking.data) {
      throw new NotFoundError('Booking');
    }

    const customerId = extractId(booking.data.customerId);
    const driverId = extractId(booking.data.driverId);

    if (customerId !== reviewerId) {
      throw new ForbiddenError('Only the booking customer can create a review');
    }

    if (booking.data.status !== 'completed') {
      throw new ValidationError('You can only review completed rides');
    }

    if (!driverId) {
      throw new ValidationError('Booking has no assigned driver');
    }

    if (revieweeId && revieweeId !== driverId) {
      throw new ValidationError('revieweeId must match booking driver');
    }

    if (driverId === reviewerId) {
      throw new ValidationError('You cannot review yourself');
    }

    const review = await Review.createReview({
      bookingId,
      reviewerId,
      revieweeId: driverId,
      rating: score,
      comment
    });

    logger.info(`Review created: ${review.id} for booking ${bookingId}`);

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

exports.getReview = async (req, res, next) => {
  try {
    const review = await Review.getReviewById(req.params.id);
    if (!review) {
      throw new NotFoundError('Review');
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

exports.getDriverReviews = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const { reviews, total } = await Review.listReviewsByReviewee(req.params.driverId, { page, limit });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyReviews = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);

    const { reviews, total } = await Review.listReviewsByReviewer(req.user.userId, { page, limit });

    res.json({
      success: true,
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const payload = {};

    if (rating !== undefined) {
      const score = Number(rating);
      if (!Number.isInteger(score) || score < 1 || score > 5) {
        throw new ValidationError('rating must be an integer from 1 to 5');
      }
      payload.rating = score;
    }

    if (comment !== undefined) {
      payload.comment = comment;
    }

    if (Object.keys(payload).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const review = await Review.updateReview(req.params.id, req.user.userId, payload);
    if (!review) {
      throw new NotFoundError('Review');
    }

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteReview = async (req, res, next) => {
  try {
    const deleted = await Review.deleteReview(req.params.id, req.user.userId);
    if (!deleted) {
      throw new NotFoundError('Review');
    }

    res.json({
      success: true,
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

exports.getDriverReviewStats = async (req, res, next) => {
  try {
    const stats = await Review.getReviewStats(req.params.driverId);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};
