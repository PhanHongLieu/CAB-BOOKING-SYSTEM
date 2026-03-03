const AppError = require("../utils/AppError");

const validate = (schema, property = "body") => (req, _res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    return next(
      new AppError(
        `Validation failed: ${error.details.map((item) => item.message).join(", ")}`,
        400,
        "VALIDATION_ERROR"
      )
    );
  }

  req[property] = value;
  return next();
};

module.exports = validate;
