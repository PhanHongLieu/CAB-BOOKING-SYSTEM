const opentracing = require('opentracing');
const jaeger = require('jaeger-client');
const logger = require('./logger');
function initTracer(serviceName) {
	const config = {
		serviceName: serviceName || process.env.SERVICE_NAME || 'unknown-service',
		sampler: {
			type: 'const',
			param: 1,
		},
		reporter: {
			agentHost: process.env.JAEGER_AGENT_HOST || 'localhost',
			agentPort: process.env.JAEGER_AGENT_PORT || 6831,
			logSpans: true,
		},
	};
	const options = {
		logger: {
			info: (msg) => logger.info(msg),
			error: (msg) => logger.error(msg),
		},
	};
	const tracer = jaeger.initTracer(config, options);
	return tracer;
}
let tracerInstance = null;
function getTracer() {
	if (!tracerInstance) {
		tracerInstance = initTracer();
	}
	return tracerInstance;
}
function tracingMiddleware(req, res, next) {
	const tracer = getTracer();
	const span = tracer.startSpan(`${req.method} ${req.path}`);
	req.span = span;
	span.setTag(opentracing.Tags.HTTP_METHOD, req.method);
	span.setTag(opentracing.Tags.HTTP_URL, req.originalUrl);
	res.on('finish', () => {
		span.setTag(opentracing.Tags.HTTP_STATUS_CODE, res.statusCode);
		span.finish();
	});
	next();
}
module.exports = { tracingMiddleware };
