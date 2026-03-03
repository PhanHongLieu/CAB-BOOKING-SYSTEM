const logger = require("../utils/logger");

const notFoundHandler = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

const errorHandler = (error, req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const code = error.code || "INTERNAL_ERROR";

  logger.error("Request failed", {
    code,
    statusCode,
    message: error.message,
    path: req.originalUrl,
    method: req.method
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: error.message || "Internal server error"
    }
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
