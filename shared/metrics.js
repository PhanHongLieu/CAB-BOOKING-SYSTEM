const client = require('prom-client');
const logger = require('./logger');

const GLOBAL_KEY = '__cab_metrics_singleton__';
if (!global[GLOBAL_KEY]) {
  const register = client.register;
  client.collectDefaultMetrics({ register });

  const getOrCreateCounter = (config) => {
    return register.getSingleMetric(config.name) || new client.Counter(config);
  };

  const getOrCreateHistogram = (config) => {
    return register.getSingleMetric(config.name) || new client.Histogram(config);
  };

  const httpRequestDuration = getOrCreateHistogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5]
  });

  const httpRequestTotal = getOrCreateCounter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  });

  const eventsPublished = getOrCreateCounter({
    name: 'events_published_total',
    help: 'Total number of events published',
    labelNames: ['event_type', 'service']
  });

  const eventsConsumed = getOrCreateCounter({
    name: 'events_consumed_total',
    help: 'Total number of events consumed',
    labelNames: ['event_type', 'service']
  });

  const databaseOperations = getOrCreateHistogram({
    name: 'database_operations_duration_seconds',
    help: 'Duration of database operations in seconds',
    labelNames: ['operation', 'collection'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1]
  });

  global[GLOBAL_KEY] = {
    register,
    httpRequestDuration,
    httpRequestTotal,
    eventsPublished,
    eventsConsumed,
    databaseOperations
  };
}

const {
  register,
  httpRequestDuration,
  httpRequestTotal,
  eventsPublished,
  eventsConsumed,
  databaseOperations
} = global[GLOBAL_KEY];

// Middleware for Express
const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration
    );
    
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
  });
  
  next();
};

// Helper functions
function recordEventPublished(eventType, serviceName) {
  eventsPublished.inc({ event_type: eventType, service: serviceName });
}

function recordEventConsumed(eventType, serviceName) {
  eventsConsumed.inc({ event_type: eventType, service: serviceName });
}

function recordDatabaseOperation(operation, collection, duration) {
  databaseOperations.observe({ operation, collection }, duration);
}

module.exports = {
  register,
  metricsMiddleware,
  recordEventPublished,
  recordEventConsumed,
  recordDatabaseOperation
};
