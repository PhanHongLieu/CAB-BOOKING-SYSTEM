const logger = require('../../../shared/logger');
const { recordEventConsumed } = require('../../../shared/metrics');
const { BOOKING_EVENTS, PAYMENT_EVENTS } = require('../../../shared/events');
const Notification = require('../models/Notification.model');

let ioInstance = null;

exports.setIo = (io) => {
  ioInstance = io;
};

async function persistAndEmit(userId, payload) {
  const saved = await Notification.create({
    userId,
    ...payload
  });

  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit('notification', saved);
  }

  return saved;
}

exports.handleBookingEvents = async (event) => {
  try {
    const { eventType, data } = event;
    recordEventConsumed(eventType, 'notification-service');

    // Persist notifications to MongoDB and emit real-time if socket is connected.
    switch (eventType) {
      case BOOKING_EVENTS.BOOKING_CREATED:
        logger.info('Booking created event received:', data);
        break;

      case BOOKING_EVENTS.BOOKING_ACCEPTED:
        if (data.customerId) {
          await persistAndEmit(data.customerId, {
            type: 'booking_accepted',
            title: 'Booking Accepted',
            message: 'A driver has accepted your booking',
            data: { bookingId: data.bookingId, driverId: data.driverId }
          });
        }
        break;

      case BOOKING_EVENTS.DRIVER_ASSIGNED:
        if (data.customerId) {
          await persistAndEmit(data.customerId, {
            type: 'driver_assigned',
            title: 'Driver Assigned',
            message: 'A driver has been assigned to your booking',
            data: { bookingId: data.bookingId, driverId: data.driverId }
          });
        }
        break;

      case BOOKING_EVENTS.BOOKING_STATUS_CHANGED: {
        const notificationMap = {
          arrived: {
            type: 'driver_arrived',
            title: 'Driver Arrived',
            message: 'Your driver has arrived'
          },
          in_progress: {
            type: 'trip_started',
            title: 'Trip Started',
            message: 'Your trip has started'
          },
          completed: {
            type: 'trip_completed',
            title: 'Trip Completed',
            message: 'Your trip has been completed'
          }
        };

        const notification = notificationMap[data.status];
        if (notification && data.customerId) {
          await persistAndEmit(data.customerId, {
            ...notification,
            data: { bookingId: data.bookingId, status: data.status }
          });
        }
        break;
      }

      case BOOKING_EVENTS.BOOKING_COMPLETED:
        if (data.customerId) {
          await persistAndEmit(data.customerId, {
            type: 'trip_completed',
            title: 'Trip Completed',
            message: 'Your trip has been completed. Please rate your driver.',
            data: { bookingId: data.bookingId }
          });
        }
        break;

      case BOOKING_EVENTS.BOOKING_CANCELLED: {
        const targetUserId = data.customerId === data.cancelledBy
          ? data.driverId
          : data.customerId;

        if (targetUserId) {
          await persistAndEmit(targetUserId, {
            type: 'booking_cancelled',
            title: 'Booking Cancelled',
            message: 'A booking has been cancelled',
            data: { bookingId: data.bookingId }
          });
        }
        break;
      }
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

    if (eventType === PAYMENT_EVENTS.PAYMENT_COMPLETED) {
      await persistAndEmit(data.customerId, {
        type: 'payment_completed',
        title: 'Payment Completed',
        message: 'Your payment has been processed successfully',
        data: { bookingId: data.bookingId, paymentId: data.paymentId }
      });
    } else if (eventType === PAYMENT_EVENTS.PAYMENT_FAILED) {
      await persistAndEmit(data.customerId, {
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
