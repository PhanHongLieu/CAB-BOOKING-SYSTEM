const loadDependency = require('./loadDependency');
const client = loadDependency('prom-client');
const logger = require('./logger');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const eventsPublished = new client.Counter({
  name: 'events_published_total',
  help: 'Total number of events published',
  labelNames: ['event_type', 'service']
});

const eventsConsumed = new client.Counter({
  name: 'events_consumed_total',
  help: 'Total number of events consumed',
  labelNames: ['event_type', 'service']
});

const databaseOperations = new client.Histogram({
  name: 'database_operations_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(eventsPublished);
register.registerMetric(eventsConsumed);
register.registerMetric(databaseOperations);

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
