const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || "user-service",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(",")
});

const USER_EVENTS_TOPIC = process.env.KAFKA_USER_EVENTS_TOPIC || "user-events";

module.exports = {
  kafka,
  USER_EVENTS_TOPIC
};
