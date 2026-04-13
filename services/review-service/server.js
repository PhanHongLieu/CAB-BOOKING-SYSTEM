const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const logger = require('../../shared/logger');
const { metricsMiddleware, register } = require('../../shared/metrics');
const { tracingMiddleware } = require('../../shared/tracing');
const { connectDatabase, closeDatabase } = require('./config/database');
const { initializeSchema } = require('./models/review.model');
const { errorHandler } = require('./middleware/errorHandler');
const reviewRoutes = require('./routes/review.routes');

const app = express();
const PORT = process.env.PORT || 3007;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(tracingMiddleware);
app.use(metricsMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'review-service', timestamp: new Date() });
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.use('/api/reviews', reviewRoutes);
app.use(errorHandler);

async function start() {
  try {
    await connectDatabase();
    await initializeSchema();

    app.listen(PORT, () => {
      logger.info(`Review Service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start review service:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await closeDatabase();
  process.exit(0);
});

start();

module.exports = app;
