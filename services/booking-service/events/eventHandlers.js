const Booking = require('../models/Booking.model');
const logger = require('../../../shared/logger');
const { recordEventConsumed } = require('../../../shared/metrics');
const { PAYMENT_EVENTS } = require('../../../shared/events');

exports.handlePaymentEvent = async (event) => {
  try {
    const { eventType, data } = event;
    recordEventConsumed(eventType, 'booking-service');

    if (eventType === PAYMENT_EVENTS.PAYMENT_COMPLETED) {
      // Update booking payment status
      const booking = await Booking.findById(data.bookingId);
      if (booking) {
        booking.paymentStatus = 'paid';
        booking.paymentId = data.paymentId;
        await booking.save();
        logger.info(`Booking ${data.bookingId} payment completed`);
      }
    } else if (eventType === PAYMENT_EVENTS.PAYMENT_FAILED) {
      // Handle payment failure
      const booking = await Booking.findById(data.bookingId);
      if (booking) {
        booking.paymentStatus = 'failed';
        await booking.save();
        logger.warn(`Booking ${data.bookingId} payment failed`);
      }
    }
  } catch (error) {
    logger.error('Error handling payment event:', error);
    throw error;
  }
};
