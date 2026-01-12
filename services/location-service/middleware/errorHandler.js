const logger = require('../../shared/logger');
const { AppError } = require('../../shared/errors');

exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  logger.error(err);

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
