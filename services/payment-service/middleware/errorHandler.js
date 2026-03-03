const logger = require('../../shared/logger');
const { AppError } = require('../../shared/errors');

exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  logger.error(err);

  if (err.name === 'CastError') {
    error = new AppError('Resource not found', 404);
  }
  if (err.code === 11000) {
    error = new AppError('Duplicate field value entered', 400);
  }
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
