const Booking = require('../models/Booking.model');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../../shared/errors');
const logger = require('../../../shared/logger');
const { getEventBus } = require('../../../shared/eventBus');
const { BOOKING_EVENTS } = require('../../../shared/events');
const { recordEventPublished } = require('../../../shared/metrics');

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
    const { role } = req.user;
    const { pickupLocation, dropoffLocation, vehicleType, scheduledAt } = req.body;

    if (!['customer', 'admin'].includes(role)) {
      throw new ForbiddenError('Only customer can create booking');
    }

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
      status: 'pending'
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

      // also produce ride.created event for downstream services
      await eventBus.publish(
        RIDE_EVENTS.RIDE_CREATED,
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
      recordEventPublished(RIDE_EVENTS.RIDE_CREATED, 'booking-service');
    } catch (error) {
      logger.error('Error publishing booking or ride created events:', error);
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

    const booking = await Booking.findById(id);

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    // Check authorization
    if (booking.customerId.toString() !== userId &&
        booking.driverId?.toString() !== userId &&
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
    const { role } = req.user;

    if (role !== 'driver') {
      throw new ForbiddenError('Only driver can accept booking');
    }

    // Atomic update to prevent two drivers accepting the same booking.
    const booking = await Booking.findOneAndUpdate(
      { _id: id, status: 'pending', driverId: { $exists: false } },
      { $set: { driverId: userId, status: 'accepted' } },
      { new: true }
    );

    if (!booking) {
      const existingBooking = await Booking.findById(id).select('status');
      if (!existingBooking) {
        throw new NotFoundError('Booking');
      }
      throw new ValidationError(`Booking is already ${existingBooking.status}`);
    }

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
    const { role } = req.user;

    const allowedStatuses = ['arrived', 'in_progress', 'completed', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      throw new ValidationError(`Unsupported status: ${status}`);
    }

    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    const isCustomer = booking.customerId.toString() === userId;
    const isAssignedDriver = booking.driverId?.toString() === userId;

    if (role !== 'admin') {
      if (status === 'cancelled') {
        if (!isCustomer && !isAssignedDriver) {
          throw new ForbiddenError('Only related customer/driver can cancel booking');
        }
      } else if (!isAssignedDriver) {
        throw new ForbiddenError('Only assigned driver can update this status');
      }
    }

    // Validate status transition
    const validTransitions = {
      'pending': ['cancelled'],
      'accepted': ['arrived', 'cancelled'],
      'driver_assigned': ['arrived', 'cancelled'],
      'arrived': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
    };

    if (!validTransitions[booking.status]?.includes(status)) {
      throw new ValidationError(`Invalid status transition from ${booking.status} to ${status}`);
    }

    const previousStatus = booking.status;
    const updatePayload = { status };

    if (status === 'in_progress') {
      updatePayload.startedAt = new Date();
    } else if (status === 'completed') {
      updatePayload.completedAt = new Date();
    } else if (status === 'cancelled') {
      updatePayload.cancelledAt = new Date();
      updatePayload.cancellationReason = req.body.reason;
    }

    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: id, status: previousStatus },
      { $set: updatePayload },
      { new: true }
    );

    if (!updatedBooking) {
      throw new ValidationError('Booking status was changed by another request. Please retry.');
    }

    // Publish booking.status.changed event
    try {
      const eventBus = getEventBus();
      await eventBus.publish(
        BOOKING_EVENTS.BOOKING_STATUS_CHANGED,
        {
          bookingId: updatedBooking._id.toString(),
          status,
          previousStatus,
          customerId: updatedBooking.customerId.toString(),
          driverId: updatedBooking.driverId?.toString()
        }
      );
      recordEventPublished(BOOKING_EVENTS.BOOKING_STATUS_CHANGED, 'booking-service');

      // Publish booking.completed event if status is completed
      if (status === 'completed') {
        await eventBus.publish(
          BOOKING_EVENTS.BOOKING_COMPLETED,
          {
            bookingId: updatedBooking._id.toString(),
            customerId: updatedBooking.customerId.toString(),
            driverId: updatedBooking.driverId?.toString(),
            fare: updatedBooking.fare
          }
        );
        recordEventPublished(BOOKING_EVENTS.BOOKING_COMPLETED, 'booking-service');
      }
    } catch (error) {
      logger.error('Error publishing booking status event:', error);
    }

    res.json({
      success: true,
      data: updatedBooking
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
    const { role } = req.user;

    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking');
    }

    const isCustomer = booking.customerId.toString() === userId;
    const isAssignedDriver = booking.driverId?.toString() === userId;

    if (role !== 'admin' && !isCustomer && !isAssignedDriver) {
      throw new ForbiddenError('You cannot cancel this booking');
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      throw new ValidationError('Cannot cancel a completed or already cancelled booking');
    }

    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: id, status: booking.status },
      {
        $set: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancellationReason: reason
        }
      },
      { new: true }
    );

    if (!updatedBooking) {
      throw new ValidationError('Booking status was changed by another request. Please retry.');
    }

    // Publish booking.cancelled event
    try {
      const eventBus = getEventBus();
      await eventBus.publish(
        BOOKING_EVENTS.BOOKING_CANCELLED,
        {
          bookingId: updatedBooking._id.toString(),
          customerId: updatedBooking.customerId.toString(),
          driverId: updatedBooking.driverId?.toString(),
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
      data: updatedBooking
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
