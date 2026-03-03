const Payment = require('../models/Payment.model');
const HttpClient = require('../../shared/httpClient');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const logger = require('../../shared/logger');
const { getEventBus } = require('../../shared/eventBus');
const { PAYMENT_EVENTS } = require('../../shared/events');
const { recordEventPublished } = require('../../shared/metrics');

const authClient = new HttpClient(process.env.AUTH_SERVICE_URL || 'http://localhost:3001');
const bookingClient = new HttpClient(process.env.BOOKING_SERVICE_URL || 'http://localhost:3002');

// Generate unique transaction ID
const generateTransactionId = () => {
  return `TXN${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

exports.createPayment = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { bookingId, paymentMethod, paymentGateway } = req.body;

    // Get booking details
    const booking = await bookingClient.get(`/api/bookings/${bookingId}`, {
      headers: { Authorization: req.headers.authorization }
    });

    if (!booking.success || booking.data.customerId !== userId) {
      throw new NotFoundError('Booking');
    }

    if (booking.data.paymentStatus === 'paid') {
      throw new ValidationError('Booking already paid');
    }

    // Create payment
    const payment = await Payment.create({
      bookingId,
      customerId: userId,
      amount: booking.data.fare.total,
      paymentMethod,
      paymentGateway: paymentGateway || paymentMethod === 'cash' ? 'cash' : 'vnpay',
      transactionId: generateTransactionId(),
      status: paymentMethod === 'cash' ? 'pending' : 'processing'
    });

    // Process payment based on method
    if (paymentMethod !== 'cash') {
      // In production, integrate with payment gateway
      // For now, simulate payment processing
      setTimeout(async () => {
        try {
          payment.status = 'completed';
          await payment.save();

          // Publish payment.completed event
          const eventBus = getEventBus();
          await eventBus.publish(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
            paymentId: payment._id.toString(),
            bookingId: bookingId,
            customerId: userId,
            amount: payment.amount,
            transactionId: payment.transactionId
          });
          recordEventPublished(PAYMENT_EVENTS.PAYMENT_COMPLETED, 'payment-service');

          logger.info(`Payment completed: ${payment._id} for booking ${bookingId}`);
        } catch (error) {
          logger.error('Error processing payment:', error);
          
          // Publish payment.failed event
          payment.status = 'failed';
          await payment.save();
          
          const eventBus = getEventBus();
          await eventBus.publish(PAYMENT_EVENTS.PAYMENT_FAILED, {
            paymentId: payment._id.toString(),
            bookingId: bookingId,
            customerId: userId,
            reason: error.message
          });
          recordEventPublished(PAYMENT_EVENTS.PAYMENT_FAILED, 'payment-service');
        }
      }, 2000);
    }

    logger.info(`Payment created: ${payment._id} for booking ${bookingId}`);

    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const payments = await Payment.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('bookingId', 'pickupLocation dropoffLocation fare');

    const total = await Payment.countDocuments({ customerId: userId });

    res.json({
      success: true,
      data: payments,
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

exports.getPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const payment = await Payment.findById(id).populate('bookingId');
    
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (payment.customerId.toString() !== userId) {
      throw new NotFoundError('Payment');
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

exports.processRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (payment.status !== 'completed') {
      throw new ValidationError('Can only refund completed payments');
    }

    const refundAmount = amount || payment.amount;
    payment.status = 'refunded';
    payment.refundAmount = refundAmount;
    payment.refundedAt = new Date();
    payment.metadata = { ...payment.metadata, refundReason: reason };
    await payment.save();

    // Publish payment.refunded event
    try {
      const eventBus = getEventBus();
      await eventBus.publish(PAYMENT_EVENTS.PAYMENT_REFUNDED, {
        paymentId: payment._id.toString(),
        bookingId: payment.bookingId.toString(),
        customerId: payment.customerId.toString(),
        refundAmount,
        reason
      });
      recordEventPublished(PAYMENT_EVENTS.PAYMENT_REFUNDED, 'payment-service');
    } catch (error) {
      logger.error('Error publishing payment.refunded event:', error);
    }

    logger.info(`Payment ${id} refunded: ${refundAmount}`);

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};
