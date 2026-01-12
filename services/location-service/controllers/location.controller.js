const redis = require('redis');
const { NotFoundError } = require('../../shared/errors');
const logger = require('../../shared/logger');
const { getEventBus } = require('../../shared/eventBus');
const { LOCATION_EVENTS } = require('../../shared/events');
const { recordEventPublished } = require('../../shared/metrics');

let redisClient = null;
exports.setRedisClient = (client) => {
  redisClient = client;
};

exports.updateLocation = async (req, res, next) => {
  try {
    const { userId, type, coordinates } = req.body;

    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }

    // Store location in Redis
    await redisClient.setEx(
      `location:${userId}`,
      60, // TTL 60 seconds
      JSON.stringify({
        userId,
        type,
        coordinates,
        timestamp: new Date().toISOString()
      })
    );

    // Publish location.updated event
    try {
      const eventBus = getEventBus();
      await eventBus.publish(LOCATION_EVENTS.LOCATION_UPDATED, {
        userId,
        type,
        coordinates,
        timestamp: new Date().toISOString()
      });
      recordEventPublished(LOCATION_EVENTS.LOCATION_UPDATED, 'location-service');
    } catch (error) {
      logger.error('Error publishing location.updated event:', error);
    }

    logger.info(`Location updated for ${type} ${userId}`);

    res.json({
      success: true,
      message: 'Location updated'
    });
  } catch (error) {
    next(error);
  }
};

exports.getLocation = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }

    const locationData = await redisClient.get(`location:${userId}`);
    
    if (!locationData) {
      throw new NotFoundError('Location');
    }

    res.json({
      success: true,
      data: JSON.parse(locationData)
    });
  } catch (error) {
    next(error);
  }
};
