const Driver = require('../models/Driver.model');
const HttpClient = require('../../shared/httpClient');
const { NotFoundError, ValidationError } = require('../../shared/errors');
const logger = require('../../shared/logger');
const { getEventBus } = require('../../shared/eventBus');
const { DRIVER_EVENTS } = require('../../shared/events');
const { recordEventPublished } = require('../../shared/metrics');

const authClient = new HttpClient(process.env.AUTH_SERVICE_URL || 'http://localhost:3001');
const locationClient = new HttpClient(process.env.LOCATION_SERVICE_URL || 'http://localhost:3006');

exports.registerDriver = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { licenseNumber, vehicle, documents } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({ userId });
    if (existingDriver) {
      throw new ValidationError('Driver profile already exists');
    }

    const driver = await Driver.create({
      userId,
      licenseNumber,
      vehicle,
      documents
    });

    logger.info(`Driver registered: ${driver._id} for user ${userId}`);

    // Publish driver.registered event
    try {
      const eventBus = getEventBus();
      await eventBus.publish(DRIVER_EVENTS.DRIVER_REGISTERED, {
        driverId: driver._id.toString(),
        userId: userId,
        vehicle: driver.vehicle
      });
      recordEventPublished(DRIVER_EVENTS.DRIVER_REGISTERED, 'driver-service');
    } catch (error) {
      logger.error('Error publishing driver.registered event:', error);
    }

    res.status(201).json({
      success: true,
      data: driver
    });
  } catch (error) {
    next(error);
  }
};

exports.getDriverProfile = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const driver = await Driver.findOne({ userId }).populate('userId', 'name email phone');
    
    if (!driver) {
      throw new NotFoundError('Driver profile');
    }

    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    next(error);
  }
};

exports.updateDriverStatus = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { isOnline, isAvailable } = req.body;

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw new NotFoundError('Driver profile');
    }

    const wasOnline = driver.isOnline;
    const wasAvailable = driver.isAvailable;

    if (isOnline !== undefined) driver.isOnline = isOnline;
    if (isAvailable !== undefined) driver.isAvailable = isAvailable;

    await driver.save();

    // Publish driver status events
    try {
      const eventBus = getEventBus();
      if (isOnline !== undefined && isOnline !== wasOnline) {
        await eventBus.publish(
          isOnline ? DRIVER_EVENTS.DRIVER_ONLINE : DRIVER_EVENTS.DRIVER_OFFLINE,
          {
            driverId: driver._id.toString(),
            userId: userId
          }
        );
        recordEventPublished(
          isOnline ? DRIVER_EVENTS.DRIVER_ONLINE : DRIVER_EVENTS.DRIVER_OFFLINE,
          'driver-service'
        );
      }

      if (isAvailable !== undefined && isAvailable !== wasAvailable) {
        await eventBus.publish(
          isAvailable ? DRIVER_EVENTS.DRIVER_AVAILABLE : DRIVER_EVENTS.DRIVER_UNAVAILABLE,
          {
            driverId: driver._id.toString(),
            userId: userId
          }
        );
        recordEventPublished(
          isAvailable ? DRIVER_EVENTS.DRIVER_AVAILABLE : DRIVER_EVENTS.DRIVER_UNAVAILABLE,
          'driver-service'
        );
      }
    } catch (error) {
      logger.error('Error publishing driver status events:', error);
    }

    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    next(error);
  }
};

exports.updateLocation = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { lat, lng } = req.body;

    const driver = await Driver.findOne({ userId });
    if (!driver) {
      throw new NotFoundError('Driver profile');
    }

    driver.location.coordinates = { lat, lng };
    driver.location.lastUpdated = new Date();
    await driver.save();

    // Publish driver.location.updated event
    try {
      const eventBus = getEventBus();
      await eventBus.publish(DRIVER_EVENTS.DRIVER_LOCATION_UPDATED, {
        driverId: driver._id.toString(),
        userId: userId,
        coordinates: { lat, lng },
        timestamp: new Date().toISOString()
      });
      recordEventPublished(DRIVER_EVENTS.DRIVER_LOCATION_UPDATED, 'driver-service');
    } catch (error) {
      logger.error('Error publishing driver.location.updated event:', error);
    }

    res.json({
      success: true,
      data: driver.location
    });
  } catch (error) {
    next(error);
  }
};

exports.getNearbyDrivers = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5 } = req.query; // radius in km

    const drivers = await Driver.find({
      isOnline: true,
      isAvailable: true,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radius * 1000 // Convert to meters
        }
      }
    })
    .populate('userId', 'name phone')
    .limit(20);

    res.json({
      success: true,
      data: drivers.map(d => ({
        driverId: d.userId._id,
        name: d.userId.name,
        phone: d.userId.phone,
        vehicle: d.vehicle,
        location: d.location,
        rating: d.rating
      }))
    });
  } catch (error) {
    next(error);
  }
};

exports.updateRating = async (req, res, next) => {
  try {
    const { driverId } = req.params;
    const { rating } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      throw new NotFoundError('Driver');
    }

    // Update rating
    const totalRating = driver.rating.average * driver.rating.count + rating;
    driver.rating.count += 1;
    driver.rating.average = totalRating / driver.rating.count;

    await driver.save();

    res.json({
      success: true,
      data: driver.rating
    });
  } catch (error) {
    next(error);
  }
};
