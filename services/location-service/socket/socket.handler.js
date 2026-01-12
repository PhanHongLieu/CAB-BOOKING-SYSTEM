const logger = require('../../../shared/logger');
const { getEventBus } = require('../../../shared/eventBus');
const { LOCATION_EVENTS } = require('../../../shared/events');
const { recordEventPublished } = require('../../../shared/metrics');

// Store active tracking sessions: bookingId -> { driverId, customerId, driverSocket, customerSocket }
const activeTrackings = new Map();

module.exports = (io, socket, redisClient) => {
  logger.info(`Socket connected: ${socket.id}`);

  // Start tracking a booking
  socket.on('start_tracking', async (data) => {
    try {
      const { bookingId, userId, userType } = data; // userType: 'driver' or 'customer'
      
      socket.join(`booking:${bookingId}`);
      
      if (!activeTrackings.has(bookingId)) {
        activeTrackings.set(bookingId, {
          driverId: null,
          customerId: null,
          driverSocket: null,
          customerSocket: null
        });
      }

      const tracking = activeTrackings.get(bookingId);
      if (userType === 'driver') {
        tracking.driverId = userId;
        tracking.driverSocket = socket.id;
      } else {
        tracking.customerId = userId;
        tracking.customerSocket = socket.id;
      }

      // Publish tracking.started event
      try {
        const eventBus = getEventBus();
        await eventBus.publish(LOCATION_EVENTS.TRACKING_STARTED, {
          bookingId,
          userId,
          userType
        });
        recordEventPublished(LOCATION_EVENTS.TRACKING_STARTED, 'location-service');
      } catch (error) {
        logger.error('Error publishing tracking.started event:', error);
      }

      logger.info(`Tracking started for booking ${bookingId} by ${userType} ${userId}`);
    } catch (error) {
      logger.error('Error starting tracking:', error);
    }
  });

  // Update location
  socket.on('update_location', async (data) => {
    try {
      const { bookingId, userId, coordinates } = data;
      
      // Store in Redis for quick access
      await redisClient.setEx(
        `location:${userId}`,
        60, // TTL 60 seconds
        JSON.stringify({
          coordinates,
          timestamp: new Date().toISOString()
        })
      );

      // Broadcast to other party in the booking
      const tracking = activeTrackings.get(bookingId);
      if (tracking) {
        const targetSocket = tracking.driverId === userId 
          ? tracking.customerSocket 
          : tracking.driverSocket;
        
        if (targetSocket) {
          io.to(targetSocket).emit('location_update', {
            userId,
            coordinates,
            timestamp: new Date()
          });
        }
      }

      // Also broadcast to booking room
      io.to(`booking:${bookingId}`).emit('location_update', {
        userId,
        coordinates,
        timestamp: new Date()
      });

      // Publish location.updated event
      try {
        const eventBus = getEventBus();
        await eventBus.publish(LOCATION_EVENTS.LOCATION_UPDATED, {
          bookingId,
          userId,
          coordinates,
          timestamp: new Date().toISOString()
        });
        recordEventPublished(LOCATION_EVENTS.LOCATION_UPDATED, 'location-service');
      } catch (error) {
        logger.error('Error publishing location.updated event:', error);
      }
    } catch (error) {
      logger.error('Error updating location:', error);
    }
  });

  // Stop tracking
  socket.on('stop_tracking', async (bookingId) => {
    socket.leave(`booking:${bookingId}`);
    
    // Publish tracking.stopped event
    try {
      const eventBus = getEventBus();
      await eventBus.publish(LOCATION_EVENTS.TRACKING_STOPPED, {
        bookingId
      });
      recordEventPublished(LOCATION_EVENTS.TRACKING_STOPPED, 'location-service');
    } catch (error) {
      logger.error('Error publishing tracking.stopped event:', error);
    }
    
    logger.info(`Tracking stopped for booking ${bookingId}`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    // Clean up tracking sessions
    for (const [bookingId, tracking] of activeTrackings.entries()) {
      if (tracking.driverSocket === socket.id) {
        tracking.driverSocket = null;
      }
      if (tracking.customerSocket === socket.id) {
        tracking.customerSocket = null;
      }
      
      // Remove if both disconnected
      if (!tracking.driverSocket && !tracking.customerSocket) {
        activeTrackings.delete(bookingId);
      }
    }
    logger.info(`Socket disconnected: ${socket.id}`);
  });
};
