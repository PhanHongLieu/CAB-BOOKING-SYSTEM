const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const redis = require('redis');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const path = require('path');
const logger = require(path.resolve(__dirname, './shared/logger.js'));
const { errorHandler } = require('./middleware/errorHandler.js');
const { metricsMiddleware, register } = require(path.resolve(__dirname, './shared/metrics.js'));
const { tracingMiddleware } = require(path.resolve(__dirname, './shared/tracing.js'));
const { getEventBus } = require(path.resolve(__dirname, './shared/eventBus.js'));
const { BOOKING_EVENTS, RIDE_EVENTS } = require(path.resolve(__dirname, './shared/events.js'));
const rideRoutes = require('./routes/ride.routes');
const eventHandlers = require('./events/eventHandlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3007;

// security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// observability
app.use(tracingMiddleware);
app.use(metricsMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'ride-service', timestamp: new Date() });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/rides', rideRoutes);
app.use(errorHandler);

// redis client for geo

// Redis v3.x API
const redisClient = redis.createClient(6379, 'redis');
redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => {
  logger.info('Redis connected successfully');
});

// make redis available to controllers or handlers
const rideController = require('./controllers/ride.controller');
rideController.setRedisClient(redisClient);

// websocket
io.on('connection', (socket) => {
  logger.info('Socket connected', { id: socket.id });
  socket.on('locationUpdate', async (data) => {
    const { driverId, lat, lng, rideId } = data;

    if (driverId && lat != null && lng != null) {
      try {
        // update geo index
        await redisClient.geoAdd('drivers', { longitude: lng, latitude: lat, member: driverId });

        // optionally update ride current location
        if (rideId) {
          await rideController.storeLocation(rideId, { lat, lng });
        }

        // publish event
        const eventBus = getEventBus();
        await eventBus.publish(
          RIDE_EVENTS.DRIVER_LOCATION_UPDATED,
          { driverId, rideId, coordinates: { lat, lng }, timestamp: new Date().toISOString() }
        );
      } catch (err) {
        logger.error('Error processing location update', err);
      }
    }
  });
});

// initialize event bus subscriptions
async function initializeEventBus() {
  try {
    const eventBus = getEventBus();
    await eventBus.connect();
    // ride service listens to booking events to create/assign rides
    await eventBus.subscribe(
      'ride-service-booking-queue',
      [
        BOOKING_EVENTS.BOOKING_CREATED,
        BOOKING_EVENTS.BOOKING_ACCEPTED,
        BOOKING_EVENTS.BOOKING_STATUS_CHANGED
      ],
      eventHandlers.handleBookingEvents
    );

    logger.info('Event Bus initialized for ride-service');
  } catch (error) {
    logger.error('Failed to initialize Event Bus:', error);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }
}

// mongoose connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ride_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  logger.info('MongoDB connected successfully');
  await initializeEventBus();
  server.listen(PORT, () => {
    logger.info(`Ride Service running on port ${PORT}`);
  });
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  const eventBus = getEventBus();
  await eventBus.close();
  await redisClient.quit();
  mongoose.connection.close();
  process.exit(0);
});

module.exports = { app, io };
