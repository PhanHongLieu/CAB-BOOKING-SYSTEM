const { kafka, USER_EVENTS_TOPIC } = require("../config/kafka");
const logger = require("../utils/logger");

const producer = kafka.producer();
let producerConnected = false;

const connectProducer = async () => {
  if (!producerConnected) {
    await producer.connect();
    producerConnected = true;
    logger.info("Kafka producer connected");
  }
};

const publishEvent = async (eventType, payload) => {
  await connectProducer();

  const message = {
    eventType,
    payload,
    timestamp: new Date().toISOString()
  };

  await producer.send({
    topic: USER_EVENTS_TOPIC,
    messages: [{ key: String(payload.user_id || payload.userId || "unknown"), value: JSON.stringify(message) }]
  });

  logger.info("Kafka event published", { eventType, topic: USER_EVENTS_TOPIC });
};

const disconnectProducer = async () => {
  if (producerConnected) {
    await producer.disconnect();
    producerConnected = false;
    logger.info("Kafka producer disconnected");
  }
};

module.exports = {
  publishEvent,
  disconnectProducer
};
