const Ride = require('../models/Ride.model.js');
const path = require('path');
const logger = require(path.resolve(__dirname, '../shared/logger.js'));
const { getEventBus } = require(path.resolve(__dirname, '../shared/eventBus.js'));
const { BOOKING_EVENTS, RIDE_EVENTS } = require(path.resolve(__dirname, '../shared/events.js'));

exports.handleBookingEvents = async (message) => {
  try {
    const { eventType, data } = message;
    switch (eventType) {
      case BOOKING_EVENTS.BOOKING_CREATED:
        await handleBookingCreated(data);
        break;
      case BOOKING_EVENTS.BOOKING_ACCEPTED:
        await handleBookingAccepted(data);
        break;
      case BOOKING_EVENTS.BOOKING_STATUS_CHANGED:
        await handleBookingStatusChanged(data);
        break;
      default:
        logger.warn('Ride service received unhandled booking event', { eventType });
    }
  } catch (err) {
    logger.error('Error processing booking event in ride service', err);
    throw err;
  }
};

async function handleBookingCreated(data) {
  const { bookingId, customerId, pickupLocation, dropoffLocation, fare, vehicleType } = data;
  const ride = await Ride.create({
    bookingId,
    customerId,
    pickupLocation,
    dropoffLocation,
    fare,
    vehicleType,
    status: 'created'
  });
  // publish ride.created event
  const eventBus = getEventBus();
  await eventBus.publish(RIDE_EVENTS.RIDE_CREATED, {
    rideId: ride._id.toString(),
    bookingId,
    customerId
  });
}

async function handleBookingAccepted(data) {
  const { bookingId, driverId } = data;
  const ride = await Ride.findOne({ bookingId });
  if (!ride) return;
  ride.driverId = driverId;
  ride.status = 'assigned';
  await ride.save();
  const eventBus = getEventBus();
  await eventBus.publish(RIDE_EVENTS.RIDE_ASSIGNED, {
    rideId: ride._id.toString(),
    bookingId,
    driverId
  });
}

async function handleBookingStatusChanged(data) {
  const { bookingId, status } = data;
  const ride = await Ride.findOne({ bookingId });
  if (!ride) return;
  // map booking status to ride status if desired
  ride.status = status;
  if (status === 'in_progress') ride.startedAt = new Date();
  if (status === 'completed') ride.completedAt = new Date();
  if (status === 'cancelled') ride.cancelledAt = new Date();
  await ride.save();
}
