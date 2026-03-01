const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('../shared/logger');
const { metricsMiddleware, register } = require('../shared/metrics');
const { tracingMiddleware } = require('../shared/tracing');
const { authenticate } = require('./middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 8000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Observability middleware
app.use(tracingMiddleware);
app.use(metricsMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'api-gateway', 
    timestamp: new Date(),
    services: {
      auth: process.env.AUTH_SERVICE_URL,
      booking: process.env.BOOKING_SERVICE_URL,
      driver: process.env.DRIVER_SERVICE_URL,
      payment: process.env.PAYMENT_SERVICE_URL,
      notification: process.env.NOTIFICATION_SERVICE_URL,
      location: process.env.LOCATION_SERVICE_URL,
      pricing: process.env.PRICING_SERVICE_URL,
      user: process.env.USER_SERVICE_URL,
      review: process.env.REVIEW_SERVICE_URL,
      ride: process.env.RIDE_SERVICE_URL
    }
  });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Service routes
const services = {
  '/api/auth': {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '/api/auth' },
    onProxyReq: fixRequestBody,
    logLevel: 'debug'
  },
  '/api/bookings': {
    target: process.env.BOOKING_SERVICE_URL || 'http://localhost:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/bookings': '/api/bookings' },
    onProxyReq: (proxyReq, req, res) => {
      fixRequestBody(proxyReq, req, res);
      // Forward authentication token
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/drivers': {
    target: process.env.DRIVER_SERVICE_URL || 'http://localhost:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/drivers': '/api/drivers' },
    onProxyReq: (proxyReq, req, res) => {
      fixRequestBody(proxyReq, req, res);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/payments': {
    target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/payments': '/api/payments' },
    onProxyReq: (proxyReq, req, res) => {
      fixRequestBody(proxyReq, req, res);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/notifications': {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/notifications': '/api/notifications' },
    onProxyReq: (proxyReq, req, res) => {
      fixRequestBody(proxyReq, req, res);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/location': {
    target: process.env.LOCATION_SERVICE_URL || 'http://localhost:3006',
    changeOrigin: true,
    pathRewrite: { '^/api/location': '/api/location' },
    onProxyReq: fixRequestBody
  },
  '/api/pricing': {
    target: process.env.PRICING_SERVICE_URL || 'http://localhost:3007',
    changeOrigin: true,
    pathRewrite: { '^/api/pricing': '/api/pricing' },
    onProxyReq: (proxyReq, req, res) => {
      fixRequestBody(proxyReq, req, res);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/users': {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3008',
    changeOrigin: true,
    pathRewrite: { '^/api/users': '/api/users' },
    onProxyReq: (proxyReq, req, res) => {
      fixRequestBody(proxyReq, req, res);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/reviews': {
    target: process.env.REVIEW_SERVICE_URL || 'http://localhost:3009',
    changeOrigin: true,
    pathRewrite: { '^/api/reviews': '/api/reviews' },
    onProxyReq: (proxyReq, req, res) => {
      fixRequestBody(proxyReq, req, res);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  },
  '/api/rides': {
    target: process.env.RIDE_SERVICE_URL || 'http://localhost:3010',
    changeOrigin: true,
    pathRewrite: { '^/api/rides': '/api/rides' },
    onProxyReq: (proxyReq, req, res) => {
      fixRequestBody(proxyReq, req, res);
      if (req.headers.authorization) {
        proxyReq.setHeader('Authorization', req.headers.authorization);
      }
    }
  }
};

// Setup proxy for each service
Object.keys(services).forEach(path => {
  app.use(path, createProxyMiddleware(services[path]));
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('API Gateway Error:', err);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});

module.exports = app;
