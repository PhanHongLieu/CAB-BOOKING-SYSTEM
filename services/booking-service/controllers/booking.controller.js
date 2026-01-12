const Booking = require('../models/Booking.model');
const HttpClient = require('../../shared/httpClient');
const { ValidationError, NotFoundError } = require('../../shared/errors');
const logger = require('../../shared/logger');
const { getEventBus } = require('../../shared/eventBus');
const { BOOKING_EVENTS } = require('../../shared/events');
const { recordEventPublished } = require('../../shared/metrics');

const authClient = new HttpClient(process.env.AUTH_SERVICE_URL || 'http://localhost:3001');
const driverClient = new HttpClient(process.env.DRIVER_SERVICE_URL || 'http://localhost:3003');
const locationClient = new HttpClient(process.env.LOCATION_SERVICE_URL || 'http://localhost:3006');
const notificationClient = new HttpClient(process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005');

// Calculate fare based on distance and time
const calculateFare = (distance, duration, vehicleType) => {
  const baseFares = {
    economy: 10000,
    comfort: 15000,
    premium: 20000,
    luxury: 30000
  };
  
  const distanceRates = {
    economy: 12000,
    comfort: 18000,
    premium: 25000,
    luxury: 35000
  };
  
  const timeRates = {
    economy: 500,
    comfort: 750,
    premium: 1000,
    luxury: 1500
  };

  const baseFare = baseFares[vehicleType] || baseFares.economy;
  const distanceFare = distance * (distanceRates[vehicleType] || distanceRates.economy);
  const timeFare = duration * (timeRates[vehicleType] || timeRates.economy);
  const total = baseFare + distanceFare + timeFare;

  return {
    baseFare,
    distanceFare,
    timeFare,
    total: Math.round(total)
  };
};

exports.createBooking = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { pickupLocation, dropoffLocation, vehicleType, scheduledAt } = req.body;

    // Calculate distance and duration (simplified - in production, use Google Maps API)
    const distance = calculateDistance(
      pickupLocation.coordinates,
      dropoffLocation.coordinates
    );
    const duration = Math.round(distance * 2); // Simplified calculation

    // Calculate fare
    const fare = calculateFare(distance, duration, vehicleType || 'economy');

    // Create booking
    const booking = await Booking.create({
      customerId: userId,
      pickupLocation,
      dropoffLocation,
      distance,
      estimatedDuration: duration,
      fare,
      vehicleType: vehicleType || 'economy',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? 'pending' : 'pending'
    });

    // Publish booking.created event (Event-Driven)
    try {
      const eventBus = getEventBus();
      await eventBus.publish(
        BOOKING_EVENTS.BOOKING_CREATED,
        {
          bookingId: booking._id.toString(),
          customerId: userId,
          pickupLocation,
          dropoffLocation,
          fare: booking.fare,
          vehicleType: booking.vehicleType,
          distance,
          estimatedDuration: duration
        }
      );
      recordEventPublished(BOOKING_EVENTS.BOOKING_CREATED, 'booking-service');
    } catch (error) {
      logger.error('Error publishing booking.created event:', error);
      // Continue even if event publishing fails
    }

    logger.info(`Booking created: ${booking._id} by user ${userId}`);

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

exports.getBookings = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { role } = req.user;
    const { status, page = 1, limit = 10 } = req.query;

    const query = role === 'driver' 
      ? { driverId: userId }
      : { customerId: userId };

    if (status) {
      query.status = status;
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('customerId', 'name email phone')
      .populate('driverId', 'name email phone');

    const total = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: bookings,
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

exports.getBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { role } = req.user;

    const booking = await Booking.findById(id)
      .populate('customerId', 'name email phone')
      .populate('driverId', 'name email phone');

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    // Check authorization
    if (booking.customerId._id.toString() !== userId && 
        booking.driverId?._id?.toString() !== userId && 
        role !== 'admin') {
      throw new NotFoundError('Booking');
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

exports.acceptBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.status !== 'pending') {
      throw new ValidationError('Booking is not available for acceptance');
    }

    booking.driverId = userId;
    booking.status = 'driver_assigned';
    await booking.save();

    // Publish booking.accepted and booking.driver.assigned events
    try {
      const eventBus = getEventBus();
      await eventBus.publish(
        BOOKING_EVENTS.BOOKING_ACCEPTED,
        {
          bookingId: booking._id.toString(),
          driverId: userId,
          customerId: booking.customerId.toString()
        }
      );
      await eventBus.publish(
        BOOKING_EVENTS.DRIVER_ASSIGNED,
        {
          bookingId: booking._id.toString(),
          driverId: userId,
          customerId: booking.customerId.toString()
        }
      );
      recordEventPublished(BOOKING_EVENTS.BOOKING_ACCEPTED, 'booking-service');
      recordEventPublished(BOOKING_EVENTS.DRIVER_ASSIGNED, 'booking-service');
    } catch (error) {
      logger.error('Error publishing booking events:', error);
    }

    logger.info(`Booking ${id} accepted by driver ${userId}`);

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.userId;

    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['accepted', 'cancelled'],
      'driver_assigned': ['arrived', 'cancelled'],
      'arrived': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      throw new ValidationError(`Invalid status transition from ${booking.status} to ${status}`);
    }

    booking.status = status;
    
    if (status === 'in_progress') {
      booking.startedAt = new Date();
    } else if (status === 'completed') {
      booking.completedAt = new Date();
    } else if (status === 'cancelled') {
      booking.cancelledAt = new Date();
      booking.cancellationReason = req.body.reason;
    }

    await booking.save();

    // Publish booking.status.changed event
    try {
      const eventBus = getEventBus();
      await eventBus.publish(
        BOOKING_EVENTS.BOOKING_STATUS_CHANGED,
        {
          bookingId: booking._id.toString(),
          status,
          previousStatus: req.body.previousStatus,
          customerId: booking.customerId.toString(),
          driverId: booking.driverId?.toString()
        }
      );
      recordEventPublished(BOOKING_EVENTS.BOOKING_STATUS_CHANGED, 'booking-service');

      // Publish booking.completed event if status is completed
      if (status === 'completed') {
        await eventBus.publish(
          BOOKING_EVENTS.BOOKING_COMPLETED,
          {
            bookingId: booking._id.toString(),
            customerId: booking.customerId.toString(),
            driverId: booking.driverId?.toString(),
            fare: booking.fare
          }
        );
        recordEventPublished(BOOKING_EVENTS.BOOKING_COMPLETED, 'booking-service');
      }
    } catch (error) {
      logger.error('Error publishing booking status event:', error);
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;

    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      throw new ValidationError('Cannot cancel a completed or already cancelled booking');
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason;
    await booking.save();

    // Publish booking.cancelled event
    try {
      const eventBus = getEventBus();
      await eventBus.publish(
        BOOKING_EVENTS.BOOKING_CANCELLED,
        {
          bookingId: booking._id.toString(),
          customerId: booking.customerId.toString(),
          driverId: booking.driverId?.toString(),
          reason,
          cancelledBy: userId
        }
      );
      recordEventPublished(BOOKING_EVENTS.BOOKING_CANCELLED, 'booking-service');
    } catch (error) {
      logger.error('Error publishing booking.cancelled event:', error);
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to calculate distance (Haversine formula)
function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
