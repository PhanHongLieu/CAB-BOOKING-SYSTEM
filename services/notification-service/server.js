const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('../../shared/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { metricsMiddleware, register } = require('../../shared/metrics');
const { tracingMiddleware } = require('../../shared/tracing');
const { getEventBus } = require('../../shared/eventBus');
const { BOOKING_EVENTS, PAYMENT_EVENTS } = require('../../shared/events');
const notificationRoutes = require('./routes/notification.routes');
const socketHandler = require('./socket/socket.handler');
const eventHandlers = require('./events/eventHandlers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3005;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Observability middleware
app.use(tracingMiddleware);
app.use(metricsMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date() });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/notifications', notificationRoutes);
app.use(errorHandler);

// Set io instance for controllers and event handlers
const notificationController = require('./controllers/notification.controller');
notificationController.setIo(io);
eventHandlers.setIo(io);

// Socket.io connection handler
io.on('connection', (socket) => socketHandler(io, socket));

// Initialize Event Bus and subscribe to events
async function initializeEventBus() {
  try {
    const eventBus = getEventBus();
    await eventBus.connect();
    
    // Subscribe to booking events
    await eventBus.subscribe(
      'notification-service-booking-queue',
      [
        BOOKING_EVENTS.BOOKING_CREATED,
        BOOKING_EVENTS.BOOKING_ACCEPTED,
        BOOKING_EVENTS.DRIVER_ASSIGNED,
        BOOKING_EVENTS.BOOKING_STATUS_CHANGED,
        BOOKING_EVENTS.BOOKING_COMPLETED,
        BOOKING_EVENTS.BOOKING_CANCELLED
      ],
      eventHandlers.handleBookingEvents
    );
    
    // Subscribe to payment events
    await eventBus.subscribe(
      'notification-service-payment-queue',
      [
        PAYMENT_EVENTS.PAYMENT_COMPLETED,
        PAYMENT_EVENTS.PAYMENT_FAILED
      ],
      eventHandlers.handlePaymentEvents
    );
    
    logger.info('Event Bus initialized and subscribed to events');
  } catch (error) {
    logger.error('Failed to initialize Event Bus:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/notification_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  logger.info('MongoDB connected successfully');
  
  // Initialize Event Bus
  await initializeEventBus();
  
  server.listen(PORT, () => {
    logger.info(`Notification Service running on port ${PORT}`);
  });
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  const eventBus = getEventBus();
  await eventBus.close();
  mongoose.connection.close();
  process.exit(0);
});

module.exports = { app, io };
