const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");

const userRoutes = require("./routes/userRoutes");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");
const logger = require("./utils/logger");

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 120),
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.http(message.trim())
    }
  })
);

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    service: process.env.SERVICE_NAME || "user-service",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use("/users", userRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
