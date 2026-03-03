const AppError = require("../utils/AppError");

const parseUserFromGateway = (req, _res, next) => {
  const headerUser = req.headers["x-user"];
  const headerUserId = req.headers["x-user-id"];

  if (req.user && req.user.userId) {
    return next();
  }

  if (headerUser) {
    try {
      req.user = JSON.parse(headerUser);
      return next();
    } catch (_error) {
      return next(new AppError("Invalid x-user header", 400, "BAD_USER_HEADER"));
    }
  }

  if (headerUserId) {
    req.user = { userId: headerUserId };
    return next();
  }

  return next(new AppError("User context missing from API Gateway", 401, "UNAUTHORIZED"));
};

module.exports = parseUserFromGateway;
