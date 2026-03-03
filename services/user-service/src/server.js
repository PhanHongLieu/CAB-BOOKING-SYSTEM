require("dotenv").config();

const app = require("./app");
const logger = require("./utils/logger");
const { connectDb, syncModels } = require("./models");
const { startConsumer, stopConsumer, markConsumerRunning } = require("./events/consumer");
const { disconnectProducer } = require("./events/producer");

const PORT = Number(process.env.PORT || 3002);

let server;

const start = async () => {
  try {
    await connectDb();
    await syncModels();

    server = app.listen(PORT, () => {
      logger.info(`user-service started on port ${PORT}`);
    });

    markConsumerRunning();
    startConsumer().catch((error) => {
      logger.error("Kafka consumer exited unexpectedly", { error: error.message });
    });
  } catch (error) {
    logger.error("Failed to start user-service", { error: error.message });
    process.exit(1);
  }
};

const shutdown = async (signal) => {
  logger.info(`Received ${signal}. Shutting down user-service...`);

  try {
    await stopConsumer();
    await disconnectProducer();
    if (server) {
      server.close(() => logger.info("HTTP server closed"));
    }
  } catch (error) {
    logger.error("Error during shutdown", { error: error.message });
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start();
