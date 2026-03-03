// Event definitions for Event-Driven Architecture
module.exports = {
	BOOKING_EVENTS: {
		BOOKING_CREATED: 'booking.created',
		BOOKING_ACCEPTED: 'booking.accepted',
		DRIVER_ASSIGNED: 'driver.assigned',
		BOOKING_STATUS_CHANGED: 'booking.status.changed',
		BOOKING_COMPLETED: 'booking.completed',
		BOOKING_CANCELLED: 'booking.cancelled'
	},
	DRIVER_EVENTS: {
		DRIVER_REGISTERED: 'driver.registered',
		DRIVER_ONLINE: 'driver.online',
		DRIVER_OFFLINE: 'driver.offline',
		DRIVER_LOCATION_UPDATED: 'driver.location.updated',
		DRIVER_AVAILABLE: 'driver.available',
		DRIVER_UNAVAILABLE: 'driver.unavailable'
	},
	PAYMENT_EVENTS: {
		PAYMENT_INITIATED: 'payment.initiated',
		PAYMENT_COMPLETED: 'payment.completed',
		PAYMENT_FAILED: 'payment.failed',
		PAYMENT_REFUNDED: 'payment.refunded'
	},
	RIDE_EVENTS: {
		RIDE_CREATED: 'ride.created',
		RIDE_ASSIGNED: 'ride.assigned',
		DRIVER_LOCATION_UPDATED: 'driver.location.updated',
		RIDE_STATUS_CHANGED: 'ride.status.changed'
	},
	NOTIFICATION_EVENTS: {
		NOTIFICATION_SENT: 'notification.sent',
		NOTIFICATION_READ: 'notification.read'
	},
	LOCATION_EVENTS: {
		LOCATION_UPDATED: 'location.updated',
		TRACKING_STARTED: 'tracking.started',
		TRACKING_STOPPED: 'tracking.stopped'
	}
};
