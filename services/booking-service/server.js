const express = require('express');
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
const bookingRoutes = require('./routes/booking.routes');
const eventHandlers = require('./events/eventHandlers');

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Observability middleware
app.use(tracingMiddleware);
app.use(metricsMiddleware);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'booking-service', timestamp: new Date() });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Routes
app.use('/api/bookings', bookingRoutes);

// Error handler
app.use(errorHandler);

// Initialize Event Bus and subscribe to events
async function initializeEventBus() {
  try {
    const eventBus = getEventBus();
    await eventBus.connect();
    
    // Subscribe to payment events
    await eventBus.subscribe(
      'booking-service-payment-queue',
      [
        PAYMENT_EVENTS.PAYMENT_COMPLETED,
        PAYMENT_EVENTS.PAYMENT_FAILED
      ],
      eventHandlers.handlePaymentEvent
    );
    
    logger.info('Event Bus initialized and subscribed to events');
  } catch (error) {
    logger.error('Failed to initialize Event Bus:', error);
    // Continue without Event Bus in development
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/booking_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  logger.info('MongoDB connected successfully');
  
  // Initialize Event Bus
  await initializeEventBus();
  
  app.listen(PORT, () => {
    logger.info(`Booking Service running on port ${PORT}`);
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

module.exports = app;
