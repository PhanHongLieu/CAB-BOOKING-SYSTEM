# Complete Setup Guide

## ✅ Hoàn thành

Tất cả các services đã được cập nhật với:

### 1. Event-Driven Architecture
- ✅ RabbitMQ Event Bus tích hợp
- ✅ Tất cả services publish/subscribe events
- ✅ Async communication giữa services

### 2. Database per Service
- ✅ Mỗi service có MongoDB database riêng
- ✅ Auth Service → `auth_db`
- ✅ Booking Service → `booking_db`
- ✅ Driver Service → `driver_db`
- ✅ Payment Service → `payment_db`
- ✅ Notification Service → `notification_db`

### 3. Observability
- ✅ Prometheus metrics tại `/metrics` endpoint
- ✅ Jaeger distributed tracing
- ✅ Grafana dashboards
- ✅ Centralized logging với Winston

### 4. Services Updated
- ✅ Auth Service
- ✅ Booking Service
- ✅ Driver Service
- ✅ Payment Service
- ✅ Notification Service
- ✅ Location Service
- ✅ API Gateway

## 🚀 Quick Start

### 1. Start Infrastructure

```bash
# Start all services với Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f [service-name]
```

### 2. Verify Services

```bash
# Health checks
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # Booking
curl http://localhost:3003/health  # Driver
curl http://localhost:3004/health  # Payment
curl http://localhost:3005/health  # Notification
curl http://localhost:3006/health  # Location
curl http://localhost:8000/health  # API Gateway

# Metrics
curl http://localhost:3001/metrics  # Auth metrics
curl http://localhost:3002/metrics  # Booking metrics
# ... etc
```

### 3. Access Monitoring Tools

- **Grafana**: http://localhost:3001 (admin/admin123)
- **Jaeger UI**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)

### 4. Test Event Flow

```bash
# 1. Register a user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "phone": "0123456789",
    "role": "customer"
  }'

# 2. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'

# 3. Create booking (use token from login)
curl -X POST http://localhost:8000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "pickupLocation": {
      "address": "123 Main St",
      "coordinates": {"lat": 10.762622, "lng": 106.660172}
    },
    "dropoffLocation": {
      "address": "456 Oak Ave",
      "coordinates": {"lat": 10.7769, "lng": 106.7009}
    },
    "vehicleType": "economy"
  }'
```

## 📊 Monitoring

### Prometheus Targets

Tất cả services được scrape bởi Prometheus:
- `auth-service:3001/metrics`
- `booking-service:3002/metrics`
- `driver-service:3003/metrics`
- `payment-service:3004/metrics`
- `notification-service:3005/metrics`
- `location-service:3006/metrics`
- `api-gateway:8000/metrics`

### Grafana Dashboards

Tạo dashboards trong Grafana để visualize:
- Request rates
- Error rates
- Response times
- Event publishing/consumption rates
- Database operation times

### Jaeger Traces

Trace requests qua các services:
- View distributed traces
- Identify bottlenecks
- Debug issues

## 🔄 Event Flow Examples

### Booking Created Flow

```
1. POST /api/bookings
   → Booking Service creates booking
   → Publishes: booking.created

2. Driver Service receives booking.created
   → Finds nearby drivers
   → Publishes: driver.nearby.found

3. Notification Service receives booking.created
   → Sends notification to nearby drivers via WebSocket
```

### Payment Flow

```
1. Booking completed
   → Booking Service publishes: booking.completed

2. Payment Service receives booking.completed
   → Creates payment record
   → Publishes: payment.initiated

3. Payment processing
   → Payment Service publishes: payment.completed

4. Booking Service receives payment.completed
   → Updates booking payment status

5. Notification Service receives payment.completed
   → Sends notification to customer
```

## 🐛 Troubleshooting

### Services không start

```bash
# Check logs
docker-compose logs [service-name]

# Check dependencies
docker-compose ps

# Restart service
docker-compose restart [service-name]
```

### Event Bus không connect

```bash
# Check RabbitMQ
docker-compose logs rabbitmq

# Check RabbitMQ Management UI
open http://localhost:15672

# Verify connection string
echo $RABBITMQ_URL
```

### Metrics không hiển thị

```bash
# Check Prometheus config
cat monitoring/prometheus.yml

# Check service metrics endpoint
curl http://localhost:3001/metrics

# Check Prometheus targets
open http://localhost:9090/targets
```

## 📝 Next Steps

1. ✅ Tất cả services đã được cập nhật
2. ⏳ Tạo Grafana dashboards
3. ⏳ Setup alerting rules
4. ⏳ Performance testing
5. ⏳ Load testing với k6 hoặc JMeter

## 🔗 Useful Links

- [Architecture Overview](ARCHITECTURE.md)
- [Event-Driven Architecture](EVENT_DRIVEN_ARCHITECTURE.md)
- [API Documentation](API.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Services Update Summary](SERVICES_UPDATE.md)
