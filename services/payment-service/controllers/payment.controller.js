const Payment = require('../models/Payment.model');
const HttpClient = require('../../../shared/httpClient');
const { NotFoundError, ValidationError } = require('../../../shared/errors');
const logger = require('../../../shared/logger'); 
const { getEventBus } = require('../../../shared/eventBus');
const { PAYMENT_EVENTS } = require('../../../shared/events'); 
const { recordEventPublished } = require('../../../shared/metrics'); 

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
          await payment.update({ status: 'completed' });

          // Publish payment.completed event
          const eventBus = getEventBus();
          await eventBus.publish(PAYMENT_EVENTS.PAYMENT_COMPLETED, {
            paymentId: payment.id,
            bookingId: bookingId,
            customerId: userId,
            amount: payment.amount,
            transactionId: payment.transactionId
          });
          recordEventPublished(PAYMENT_EVENTS.PAYMENT_COMPLETED, 'payment-service');

          logger.info(`Payment completed: ${payment.id} for booking ${bookingId}`);
        } catch (error) {
          logger.error('Error processing payment:', error);
          
          // Publish payment.failed event
          await payment.update({ status: 'failed' });
          
          const eventBus = getEventBus();
          await eventBus.publish(PAYMENT_EVENTS.PAYMENT_FAILED, {
            paymentId: payment.id,
            bookingId: bookingId,
            customerId: userId,
            reason: error.message
          });
          recordEventPublished(PAYMENT_EVENTS.PAYMENT_FAILED, 'payment-service');
        }
      }, 2000);
    }

    logger.info(`Payment created: ${payment.id} for booking ${bookingId}`);

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
    const offset = (page - 1) * limit;

    const { count, rows } = await Payment.findAndCountAll({
      where: { customerId: userId },
      offset: offset,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
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

    const payment = await Payment.findByPk(id);
    
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (payment.customerId !== userId) {
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

    const payment = await Payment.findByPk(id);
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (payment.status !== 'completed') {
      throw new ValidationError('Can only refund completed payments');
    }

    const refundAmount = amount || payment.amount;
    const metadata = payment.metadata || {};
    metadata.refundReason = reason;

    await payment.update({
      status: 'refunded',
      refundAmount: refundAmount,
      refundedAt: new Date(),
      metadata: metadata
    });

    // Publish payment.refunded event
    try {
      const eventBus = getEventBus();
      await eventBus.publish(PAYMENT_EVENTS.PAYMENT_REFUNDED, {
        paymentId: payment.id,
        bookingId: payment.bookingId,
        customerId: payment.customerId,
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
