const amqp = require('amqplib');
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
			await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
			this.isConnected = true;
			logger.info('Event Bus connected successfully');
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
			const message = JSON.stringify({ eventType, data, timestamp: new Date().toISOString() });
			await this.channel.publish(this.exchange, eventType, Buffer.from(message));
			logger.info(`Event published: ${eventType}`);
		} catch (error) {
			logger.error('Failed to publish event:', error);
		}
	}
	async subscribe(queue, eventTypes, handler) {
		if (!this.isConnected || !this.channel) {
			logger.warn('Event Bus not connected, skipping subscribe:', eventTypes);
			return;
		}
		await this.channel.assertQueue(queue, { durable: true });
		for (const eventType of eventTypes) {
			await this.channel.bindQueue(queue, this.exchange, eventType);
		}
		this.channel.consume(queue, async (msg) => {
			if (msg !== null) {
				const content = JSON.parse(msg.content.toString());
				try {
					await handler(content);
					this.channel.ack(msg);
				} catch (err) {
					logger.error('Error handling event:', err);
					this.channel.nack(msg);
				}
			}
		});
	}
	async close() {
		if (this.connection) {
			await this.connection.close();
			this.isConnected = false;
			logger.info('Event Bus connection closed');
		}
	}
}
let eventBusInstance = null;
function getEventBus() {
	if (!eventBusInstance) {
		eventBusInstance = new EventBus();
	}
	return eventBusInstance;
}
module.exports = { getEventBus };
