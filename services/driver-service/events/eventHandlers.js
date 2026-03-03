const Driver = require('../models/Driver.model');
const logger = require('../../../shared/logger');
const { recordEventConsumed } = require('../../../shared/metrics');
const { getEventBus } = require('../../../shared/eventBus');
const { BOOKING_EVENTS, DRIVER_EVENTS } = require('../../../shared/events');
const { recordEventPublished } = require('../../../shared/metrics');

exports.handleBookingCreated = async (event) => {
  try {
    const { eventType, data } = event;
    recordEventConsumed(eventType, 'driver-service');

    // Find nearby drivers
    const drivers = await Driver.find({
      isOnline: true,
      isAvailable: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [data.pickupLocation.coordinates.lng, data.pickupLocation.coordinates.lat]
          },
          $maxDistance: 5000 // 5km radius
        }
      }
    })
    .populate('userId', 'name phone')
    .limit(20);

    if (drivers.length > 0) {
      // Publish driver.nearby.found event
      const eventBus = getEventBus();
      await eventBus.publish('driver.nearby.found', {
        bookingId: data.bookingId,
        drivers: drivers.map(d => ({
          driverId: d.userId._id.toString(),
          name: d.userId.name,
          phone: d.userId.phone,
          vehicle: d.vehicle,
          location: d.location,
          rating: d.rating
        }))
      });
      recordEventPublished('driver.nearby.found', 'driver-service');
      
      logger.info(`Found ${drivers.length} nearby drivers for booking ${data.bookingId}`);
    }
  } catch (error) {
    logger.error('Error handling booking.created event:', error);
    throw error;
  }
};
