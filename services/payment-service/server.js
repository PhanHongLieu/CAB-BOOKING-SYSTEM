const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('../../shared/logger');
const { errorHandler } = require('./middleware/errorHandler');
const { metricsMiddleware, register } = require('../../shared/metrics');
const { tracingMiddleware } = require('../../shared/tracing');
const { getEventBus } = require('../../shared/eventBus');
const { BOOKING_EVENTS, PAYMENT_EVENTS } = require('../../shared/events');
const paymentRoutes = require('./routes/payment.routes');
const eventHandlers = require('./events/eventHandlers');
const { initDatabase, sequelize } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3004;

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
  res.json({ status: 'ok', service: 'payment-service', timestamp: new Date() });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/payments', paymentRoutes);
app.use(errorHandler);

// Initialize Event Bus and subscribe to events
async function initializeEventBus() {
  try {
    const eventBus = getEventBus();
    await eventBus.connect();
    
    // Subscribe to booking completed events
    await eventBus.subscribe(
      'payment-service-booking-queue',
      [
        BOOKING_EVENTS.BOOKING_COMPLETED
      ],
      eventHandlers.handleBookingCompleted
    );
    
    logger.info('Event Bus initialized and subscribed to events');
  } catch (error) {
    logger.error('Failed to initialize Event Bus:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

// Initialize application
async function startServer() {
  try {
    // Initialize database
    await initDatabase();
    logger.info('Database initialized successfully');
    
    // Initialize Event Bus
    await initializeEventBus();
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Payment Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start Payment Service:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    const eventBus = getEventBus();
    await eventBus.close();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
});

module.exports = app;
