const logger = require('../../../shared/logger');
const { recordEventConsumed } = require('../../../shared/metrics');
const { BOOKING_EVENTS, PAYMENT_EVENTS } = require('../../../shared/events');

let ioInstance = null;

exports.setIo = (io) => {
  ioInstance = io;
};

exports.handleBookingEvents = async (event) => {
  try {
    const { eventType, data } = event;
    recordEventConsumed(eventType, 'notification-service');

    if (!ioInstance) {
      logger.warn('Socket.io instance not initialized');
      return;
    }

    // Handle different booking events
    switch (eventType) {
      case BOOKING_EVENTS.BOOKING_CREATED:
        // Find nearby drivers and notify them (this would be handled by driver service)
        // For now, we'll just log it
        logger.info('Booking created event received:', data);
        break;

      case BOOKING_EVENTS.BOOKING_ACCEPTED:
      case BOOKING_EVENTS.DRIVER_ASSIGNED:
        // Notify customer
        ioInstance.to(`user:${data.customerId}`).emit('notification', {
          type: 'booking_accepted',
          title: 'Driver Assigned',
          message: 'A driver has accepted your booking',
          data: { bookingId: data.bookingId }
        });
        break;

      case BOOKING_EVENTS.BOOKING_STATUS_CHANGED:
        // Notify relevant parties based on status
        const notificationMap = {
          'arrived': { title: 'Driver Arrived', message: 'Your driver has arrived' },
          'in_progress': { title: 'Trip Started', message: 'Your trip has started' },
          'completed': { title: 'Trip Completed', message: 'Your trip has been completed' }
        };

        const notification = notificationMap[data.status];
        if (notification && data.customerId) {
          ioInstance.to(`user:${data.customerId}`).emit('notification', {
            type: 'booking_status_changed',
            ...notification,
            data: { bookingId: data.bookingId, status: data.status }
          });
        }
        break;

      case BOOKING_EVENTS.BOOKING_COMPLETED:
        // Notify customer and driver
        if (data.customerId) {
          ioInstance.to(`user:${data.customerId}`).emit('notification', {
            type: 'trip_completed',
            title: 'Trip Completed',
            message: 'Your trip has been completed. Please rate your driver.',
            data: { bookingId: data.bookingId }
          });
        }
        break;

      case BOOKING_EVENTS.BOOKING_CANCELLED:
        // Notify the other party
        const targetUserId = data.customerId === data.cancelledBy 
          ? data.driverId 
          : data.customerId;
        
        if (targetUserId) {
          ioInstance.to(`user:${targetUserId}`).emit('notification', {
            type: 'booking_cancelled',
            title: 'Booking Cancelled',
            message: 'A booking has been cancelled',
            data: { bookingId: data.bookingId }
          });
        }
        break;
    }
  } catch (error) {
    logger.error('Error handling booking event:', error);
    throw error;
  }
};

exports.handlePaymentEvents = async (event) => {
  try {
    const { eventType, data } = event;
    recordEventConsumed(eventType, 'notification-service');

    if (!ioInstance) {
      logger.warn('Socket.io instance not initialized');
      return;
    }

    if (eventType === PAYMENT_EVENTS.PAYMENT_COMPLETED) {
      ioInstance.to(`user:${data.customerId}`).emit('notification', {
        type: 'payment_completed',
        title: 'Payment Completed',
        message: 'Your payment has been processed successfully',
        data: { bookingId: data.bookingId, paymentId: data.paymentId }
      });
    } else if (eventType === PAYMENT_EVENTS.PAYMENT_FAILED) {
      ioInstance.to(`user:${data.customerId}`).emit('notification', {
        type: 'payment_failed',
        title: 'Payment Failed',
        message: 'Your payment could not be processed. Please try again.',
        data: { bookingId: data.bookingId }
      });
    }
  } catch (error) {
    logger.error('Error handling payment event:', error);
    throw error;
  }
};
