const logger = require('../../../shared/logger');
const { AppError } = require('../../../shared/errors');

exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error(err);

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    error = new AppError('Duplicate field value entered', 400);
  }

  // PostgreSQL invalid text representation (e.g. invalid bigint input)
  if (err.code === '22P02') {
    error = new AppError('Invalid input format', 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
