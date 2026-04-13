const Payment = require('../models/Payment.model');
const logger = require('../../../shared/logger');
const { recordEventConsumed } = require('../../../shared/metrics');
const { getEventBus } = require('../../../shared/eventBus');
const { BOOKING_EVENTS, PAYMENT_EVENTS } = require('../../../shared/events');
const { recordEventPublished } = require('../../../shared/metrics');

exports.handleBookingCompleted = async (event) => {
  try {
    const { eventType, data } = event;
    recordEventConsumed(eventType, 'payment-service');

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ where: { bookingId: data.bookingId } });
    if (existingPayment) {
      logger.info(`Payment already exists for booking ${data.bookingId}`);
      return;
    }

    // Create payment record
    const payment = await Payment.create({
      bookingId: data.bookingId,
      customerId: data.customerId,
      amount: data.fare.total,
      currency: 'VND',
      paymentMethod: 'pending', // Will be updated when customer pays
      status: 'pending',
      paymentGateway: 'cash' // Default to cash
    });

    // Publish payment.initiated event
    const eventBus = getEventBus();
    await eventBus.publish(PAYMENT_EVENTS.PAYMENT_INITIATED, {
      paymentId: payment.id,
      bookingId: data.bookingId,
      customerId: data.customerId,
      amount: data.fare.total
    });
    recordEventPublished(PAYMENT_EVENTS.PAYMENT_INITIATED, 'payment-service');

    logger.info(`Payment initiated for booking ${data.bookingId}`);
  } catch (error) {
    logger.error('Error handling booking.completed event:', error);
    throw error;
  }
};
