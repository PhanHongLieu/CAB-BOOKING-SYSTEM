const { resolveDependency } = require('./resolveDependency');
const opentracing = resolveDependency('opentracing');
const jaeger = resolveDependency('jaeger-client');
const logger = require('./logger');

// Initialize Jaeger tracer
function initTracer(serviceName) {
  const config = {
    serviceName: serviceName || process.env.SERVICE_NAME || 'unknown-service',
    sampler: {
      type: 'const',
      param: 1, // Sample all traces
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

// Get tracer instance
let tracerInstance = null;

function getTracer() {
  if (!tracerInstance) {
    tracerInstance = initTracer();
  }
  return tracerInstance;
}

// Middleware for Express
function tracingMiddleware(req, res, next) {
  const tracer = getTracer();
  const span = tracer.startSpan(`${req.method} ${req.path}`);
  
  // Add span to request
  req.span = span;
  
  // Set tags
  span.setTag(opentracing.Tags.HTTP_METHOD, req.method);
  span.setTag(opentracing.Tags.HTTP_URL, req.path);
  span.setTag(opentracing.Tags.SPAN_KIND, opentracing.Tags.SPAN_KIND_RPC_SERVER);
  
  res.on('finish', () => {
    span.setTag(opentracing.Tags.HTTP_STATUS_CODE, res.statusCode);
    if (res.statusCode >= 400) {
      span.setTag(opentracing.Tags.ERROR, true);
    }
    span.finish();
  });
  
  next();
}

module.exports = {
  getTracer,
  initTracer,
  tracingMiddleware
};
