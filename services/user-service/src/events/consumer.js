const { kafka, USER_EVENTS_TOPIC } = require("../config/kafka");
const userService = require("../services/userService");
const logger = require("../utils/logger");

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID || "user-service-group"
});

let consumerConnected = false;
let running = false;

const handleEvent = async (eventType, payload) => {
  switch (eventType) {
    case "UserRegistered":
      await userService.handleUserRegistered(payload);
      logger.info("Handled UserRegistered event", { userId: payload.user_id || payload.userId });
      break;
    case "UserBanned":
      await userService.handleUserBanned(payload);
      logger.info("Handled UserBanned event", { userId: payload.user_id || payload.userId });
      break;
    default:
      logger.warn("Ignored unknown event", { eventType });
  }
};

const startConsumer = async () => {
  const retryMs = Number(process.env.KAFKA_CONSUMER_RETRY_MS || 5000);

  while (running) {
    try {
      await consumer.connect();
      consumerConnected = true;
      logger.info("Kafka consumer connected");

      await consumer.subscribe({ topic: USER_EVENTS_TOPIC, fromBeginning: false });

      await consumer.run({
        eachMessage: async ({ message }) => {
          try {
            const parsed = JSON.parse(message.value.toString());
            await handleEvent(parsed.eventType, parsed.payload || {});
          } catch (error) {
            logger.error("Failed processing kafka message", { error: error.message });
          }
        }
      });

      return;
    } catch (error) {
      logger.error("Kafka consumer start failed, will retry", { error: error.message, retryMs });
      if (consumerConnected) {
        try {
          await consumer.disconnect();
        } catch (_error) {
          // Ignore disconnect failure during retry.
        }
        consumerConnected = false;
      }

      if (!running) {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, retryMs));
    }
  }
};

const stopConsumer = async () => {
  running = false;
  if (consumerConnected) {
    await consumer.disconnect();
    consumerConnected = false;
    logger.info("Kafka consumer disconnected");
  }
};

module.exports = {
  startConsumer,
  stopConsumer,
  markConsumerRunning: () => {
    running = true;
  }
};
