# Event-Driven Architecture

## Tổng quan

Hệ thống CAB Booking sử dụng **Event-Driven Architecture** để đảm bảo:
- **Loose Coupling** - Services độc lập với nhau
- **Scalability** - Mỗi service có thể scale độc lập
- **Fault Tolerance** - Services không bị ảnh hưởng khi service khác down
- **Async Processing** - Xử lý bất đồng bộ, không blocking

## Event Bus

### RabbitMQ Configuration
- **Exchange**: `cab_booking_events` (Topic exchange)
- **Port**: 5672 (AMQP), 15672 (Management UI)
- **Credentials**: admin/admin123

### Event Types

#### Booking Events
- `booking.created` - Booking được tạo
- `booking.accepted` - Driver chấp nhận booking
- `driver.assigned` - Driver được gán cho booking
- `booking.status.changed` - Trạng thái booking thay đổi
- `booking.completed` - Booking hoàn thành
- `booking.cancelled` - Booking bị hủy

#### Payment Events
- `payment.initiated` - Thanh toán được khởi tạo
- `payment.completed` - Thanh toán thành công
- `payment.failed` - Thanh toán thất bại
- `payment.refunded` - Hoàn tiền

#### Driver Events
- `driver.registered` - Driver đăng ký
- `driver.online` - Driver online
- `driver.offline` - Driver offline
- `driver.location.updated` - Vị trí driver cập nhật

#### Location Events
- `location.updated` - Vị trí được cập nhật
- `tracking.started` - Bắt đầu tracking
- `tracking.stopped` - Dừng tracking

## Event Flow Examples

### Booking Flow

```
1. Customer tạo booking
   Booking Service:
   - Tạo booking trong database
   - Publish: booking.created
   
2. Driver Service nhận event
   Driver Service:
   - Tìm nearby drivers
   - Publish: driver.nearby.found
   
3. Notification Service nhận event
   Notification Service:
   - Gửi notification cho nearby drivers qua WebSocket
   
4. Driver accept booking
   Booking Service:
   - Update booking status
   - Publish: booking.accepted, driver.assigned
   
5. Notification Service nhận events
   Notification Service:
   - Gửi notification cho customer
```

### Payment Flow

```
1. Booking completed
   Booking Service:
   - Publish: booking.completed
   
2. Payment Service nhận event
   Payment Service:
   - Tạo payment record
   - Xử lý thanh toán
   - Publish: payment.completed hoặc payment.failed
   
3. Booking Service nhận payment event
   Booking Service:
   - Update booking payment status
   
4. Notification Service nhận payment event
   Notification Service:
   - Gửi notification cho customer
```

## Event Publishing

### Example: Publishing Event

```javascript
const { getEventBus } = require('../../shared/eventBus');
const { BOOKING_EVENTS } = require('../../shared/events');
const { recordEventPublished } = require('../../shared/metrics');

// Publish event
const eventBus = getEventBus();
await eventBus.publish(
  BOOKING_EVENTS.BOOKING_CREATED,
  {
    bookingId: booking._id.toString(),
    customerId: userId,
    pickupLocation,
    dropoffLocation,
    fare: booking.fare
  }
);

// Record metric
recordEventPublished(BOOKING_EVENTS.BOOKING_CREATED, 'booking-service');
```

## Event Subscription

### Example: Subscribing to Events

```javascript
const { getEventBus } = require('../../shared/eventBus');
const { BOOKING_EVENTS } = require('../../shared/events');

// Subscribe to events
const eventBus = getEventBus();
await eventBus.subscribe(
  'notification-service-booking-queue',
  [
    BOOKING_EVENTS.BOOKING_CREATED,
    BOOKING_EVENTS.BOOKING_ACCEPTED,
    BOOKING_EVENTS.BOOKING_COMPLETED
  ],
  async (event) => {
    // Handle event
    const { eventType, data } = event;
    // Process event...
  }
);
```

## Event Handler Pattern

Mỗi service có event handlers riêng để xử lý events:

```javascript
// services/notification-service/events/eventHandlers.js
exports.handleBookingEvents = async (event) => {
  const { eventType, data } = event;
  
  switch (eventType) {
    case BOOKING_EVENTS.BOOKING_CREATED:
      // Handle booking created
      break;
    case BOOKING_EVENTS.BOOKING_ACCEPTED:
      // Handle booking accepted
      break;
    // ...
  }
};
```

## Error Handling

Events được xử lý với error handling:
- **Retry Logic** - Failed events được requeue
- **Dead Letter Queue** - Events failed nhiều lần được move vào DLQ
- **Logging** - Tất cả events được log

## Monitoring Events

- **Prometheus Metrics** - Track số lượng events published/consumed
- **Jaeger Tracing** - Trace event flow qua services
- **RabbitMQ Management UI** - Monitor queues và exchanges

## Best Practices

1. **Idempotency** - Event handlers phải idempotent
2. **Event Versioning** - Events có version để backward compatibility
3. **Event Schema** - Validate event schema trước khi process
4. **Error Handling** - Always handle errors gracefully
5. **Monitoring** - Monitor event processing metrics
