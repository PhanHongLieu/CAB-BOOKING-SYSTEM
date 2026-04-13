const loadDependency = require('./loadDependency');
const amqp = loadDependency('amqplib');
const logger = require('./logger');

class EventBus {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = process.env.EVENT_EXCHANGE || 'cab_booking_events';
    this.isConnected = false;
  }

  async connect() {
    try {
      const url = process.env.RABBITMQ_URL || 'amqp://admin:admin123@localhost:5672';
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      
      // Declare exchange
      await this.channel.assertExchange(this.exchange, 'topic', {
        durable: true
      });
      
      this.isConnected = true;
      logger.info('Event Bus connected successfully');
      
      // Handle connection errors
      this.connection.on('error', (err) => {
        logger.error('Event Bus connection error:', err);
        this.isConnected = false;
      });
      
      this.connection.on('close', () => {
        logger.warn('Event Bus connection closed');
        this.isConnected = false;
      });
    } catch (error) {
      logger.error('Failed to connect to Event Bus:', error);
      throw error;
    }
  }

  async publish(eventType, data) {
    if (!this.isConnected || !this.channel) {
      logger.warn('Event Bus not connected, skipping publish:', eventType);
      return;
    }

    try {
      const message = JSON.stringify({
        eventType,
        data,
        timestamp: new Date().toISOString(),
        service: process.env.SERVICE_NAME || 'unknown'
      });

      await this.channel.publish(
        this.exchange,
        eventType,
        Buffer.from(message),
        {
          persistent: true,
          timestamp: Date.now()
        }
      );

      logger.info(`Event published: ${eventType}`, { data });
    } catch (error) {
      logger.error(`Failed to publish event ${eventType}:`, error);
      throw error;
    }
  }

  async subscribe(queueName, eventTypes, handler) {
    if (!this.isConnected || !this.channel) {
      logger.warn('Event Bus not connected, cannot subscribe');
      return;
    }

    try {
      // Assert queue
      const queue = await this.channel.assertQueue(queueName, {
        durable: true
      });

      // Bind queue to exchange for each event type
      for (const eventType of eventTypes) {
        await this.channel.bindQueue(queue.queue, this.exchange, eventType);
      }

      // Consume messages
      await this.channel.consume(queue.queue, async (msg) => {
        if (msg) {
          try {
            const content = JSON.parse(msg.content.toString());
            logger.info(`Event received: ${content.eventType}`, { data: content.data });
            
            await handler(content);
            
            this.channel.ack(msg);
          } catch (error) {
            logger.error('Error processing event:', error);
            // Nack and requeue for retry
            this.channel.nack(msg, false, true);
          }
        }
      }, {
        noAck: false
      });

      logger.info(`Subscribed to queue: ${queueName} for events: ${eventTypes.join(', ')}`);
    } catch (error) {
      logger.error(`Failed to subscribe to queue ${queueName}:`, error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.isConnected = false;
      logger.info('Event Bus connection closed');
    } catch (error) {
      logger.error('Error closing Event Bus:', error);
    }
  }
}

// Singleton instance
let eventBusInstance = null;

function getEventBus() {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus();
  }
  return eventBusInstance;
}

module.exports = { getEventBus, EventBus };
