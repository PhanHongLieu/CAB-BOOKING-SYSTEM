const client = require('prom-client');
const logger = require('./logger');
const register = new client.Registry();
client.collectDefaultMetrics({ register });
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
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(eventsPublished);
register.registerMetric(eventsConsumed);
register.registerMetric(databaseOperations);
function metricsMiddleware(req, res, next) {
	const end = httpRequestDuration.startTimer();
	res.on('finish', () => {
		httpRequestTotal.inc({
			method: req.method,
			route: req.route?.path || req.path,
			status_code: res.statusCode
		});
		end({
			method: req.method,
			route: req.route?.path || req.path,
			status_code: res.statusCode
		});
	});
	next();
}
module.exports = { metricsMiddleware, register };
