const { validationResult } = require('express-validator');
const { ValidationError } = require('../../../shared/errors');

exports.validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const message = errors
    .array()
    .map((err) => err.msg)
    .join(', ');

  return next(new ValidationError(message));
};
