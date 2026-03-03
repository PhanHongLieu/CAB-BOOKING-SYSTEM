# CAB Booking System - Ride Service Implementation Complete

## 📋 Executive Summary

The **Ride Service** has been fully implemented as a key microservice in the CAB Booking System. It manages the complete lifecycle of rides, provides real-time GPS tracking, and integrates with the event-driven architecture using RabbitMQ.

### Key Statistics
- **Service Port**: 3007
- **Database**: MongoDB (ride_db) on port 27023
- **Event Queue**: RabbitMQ (cab_booking_events topic exchange)
- **Dependencies**: 457 npm packages installed
- **Docker Support**: ✓ Complete Dockerfile included
- **Kubernetes Support**: ✓ Production-grade deployment manifests

---

## 🏗️ Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (3000)                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────┬────────────────┬─────────────┐
        ↓             ↓                ↓             ↓
   Auth Service   Booking Service  Driver Service  Ride Service
    (3001)          (3002)           (3003)        (3007) ★NEW★
                                                      ↓
                    ┌──────────────────────────────────┤
                    ↓              ↓                   ↓
              MongoDB         Redis Geo         RabbitMQ
              (27023)         (6379)            (5672)
```

### Data Flow

1. **Booking Created** → Auth/Booking Service
2. **booking.created Event** → RabbitMQ publish
3. **Ride Service Listener** → Receives event via RabbitMQ
4. **Ride Document Created** → MongoDB (ride_db)
5. **ride.created Event** → Published for notification/ETA services
6. **Real-time Updates** → WebSocket location tracking
7. **Ride Completion** → Final status update triggers payment

---

## 📦 Files Created/Modified

### New Files Created

```
services/ride-service/
├── server.js                    # Express server + Socket.IO + Event Bus
├── package.json                 # Dependencies
├── Dockerfile                   # Container image
├── controllers/
│   └── ride.controller.js       # Ride endpoints (GET rides, GET ride by ID)
├── models/
│   └── Ride.model.js            # MongoDB schema
├── routes/
│   └── ride.routes.js           # API routes
├── events/
│   └── eventHandlers.js         # RabbitMQ event listeners
└── middleware/
    ├── auth.middleware.js       # JWT authentication
    └── errorHandler.js          # Error handling

k8s/
└── ride-service-deployment.yaml # K8s manifests (Deployment, Service, HPA)

docs/
├── RIDE_SERVICE_COMPLETE.md     # Comprehensive guide
├── POSTMAN_COLLECTION.json      # API testing collection
└── RIDE_SERVICE_ARCHITECTURE.md # Technical architecture

scripts/
└── test-complete.js             # End-to-end test suite
```

### Modified Files

```
shared/
└── events.js                    # Added RIDE_EVENTS constants

services/booking-service/
└── controllers/booking.controller.js  # Now publishes RIDE_EVENTS

docker-compose.yml              # Added:
                                 # - mongodb-ride service
                                 # - ride-service container
                                 # - mongodb_ride_data volume
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm 9+
- Git

### Step 1: Install Ride Service Dependencies
```bash
cd services/ride-service
npm install
```

### Step 2: Start Docker Containers
```bash
cd ../..  # Go to project root
docker-compose up -d
```

### Step 3: Verify Services
```bash
# Check health endpoints
curl http://localhost:3001/health      # Auth Service
curl http://localhost:3002/health      # Booking Service
curl http://localhost:3007/health      # Ride Service ✓

# Should return: {"status":"ok","service":"ride-service","timestamp":"..."}
```

### Step 4: Run Tests
```bash
node scripts/test-complete.js
```

---

## 📊 Database Schema

### Ride Model (MongoDB)
```javascript
{
  _id: ObjectId,
  bookingId: ObjectId,              // References booking
  customerId: ObjectId,              // References customer
  driverId: ObjectId,                // References driver
  status: 'created'|'assigned'|'in_progress'|'completed'|'cancelled',
  pickupLocation: {
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  dropoffLocation: {
    address: String,
    coordinates: { lat: Number, lng: Number }
  },
  fare: {
    baseFare: Number,
    distanceFare: Number,
    timeFare: Number,
    total: Number
  },
  vehicleType: 'economy'|'comfort'|'premium'|'luxury',
  currentLocation: { lat: Number, lng: Number },
  route: [
    {
      lat: Number,
      lng: Number,
      timestamp: Date
    }
  ],
  startedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
```javascript
bookingId: 1                          // Query by booking
driverId: 1, createdAt: -1           // Driver's ride history
customerId: 1, createdAt: -1         // Customer's ride history
```

### Redis Geo Storage
```redis
GEOADD drivers lon lat driverId      # Store driver location
# Example: GEOADD drivers 106.702 10.776 driver123
```

---

## 🔄 Event Flow

### Events Published by Ride Service

| Event | Topic | Subscribers | Payload |
|-------|-------|-------------|---------|
| `ride.created` | `ride.created` | Notification, ETA | `{rideId, bookingId, customerId}` |
| `ride.assigned` | `ride.assigned` | Notification | `{rideId, bookingId, driverId}` |
| `driver.location.updated` | `driver.location.updated` | ETA, Monitoring | `{driverId, rideId, coordinates, timestamp}` |

### Events Consumed by Ride Service

| Event | Source | Action |
|-------|--------|--------|
| `booking.created` | Booking Service | Create Ride document (status: 'created') |
| `booking.accepted` | Booking Service | Assign driver (status: 'assigned') |
| `booking.status.changed` | Booking Service | Update ride status accordingly |

---

## 🧪 Testing Guide

### Using Postman

1. **Import Collection**
   - Open Postman
   - File → Import
   - Select `docs/POSTMAN_COLLECTION.json`

2. **Run Workflow**
   - Register Customer (save token to {{token}})
   - Register Driver (save token to {{driver_token}})
   - Create Booking
   - Accept Booking (as driver)
   - Update Status → in_progress
   - Update Status → completed
   - Get Ride Details

### Using CLI Test Script

```bash
# Run complete end-to-end test
node scripts/test-complete.js

# Expected output:
# ✓ Health checks: PASSED
# ✓ User management: PASSED
# ✓ Booking creation: PASSED
# ✓ Ride creation (via events): PASSED
# ✓ Event-driven integration: PASSED
# ✓ ALL TESTS PASSED SUCCESSFULLY!
```

### Manual Testing

```bash
# 1. Create Booking
curl -X POST http://localhost:3002/api/bookings \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupLocation": {
      "address": "123 Main St",
      "coordinates": {"lat": 10.7738, "lng": 106.7026}
    },
    "dropoffLocation": {
      "address": "456 Park Ave",
      "coordinates": {"lat": 10.7922, "lng": 106.7043}
    },
    "vehicleType": "economy"
  }'

# 2. Get Rides (should include auto-created ride)
curl http://localhost:3007/api/rides \
  -H "Authorization: Bearer {token}"

# 3. Accept as Driver
curl -X POST http://localhost:3002/api/bookings/{bookingId}/accept \
  -H "Authorization: Bearer {driver_token}"

# 4. Check Ride Status Updated
curl http://localhost:3007/api/rides/{rideId} \
  -H "Authorization: Bearer {token}"
```

---

## 🐳 Docker Deployment

### Build Images
```bash
# Build all services including ride-service
docker-compose build

# Or build just ride-service
docker-compose build ride-service
```

### Start Services
```bash
# Start all containers
docker-compose up -d

# Or start specific service
docker-compose up -d ride-service
```

### View Logs
```bash
# Ride service logs
docker logs -f cab-ride-service

# All services
docker-compose logs -f

# Specific service with timestamps
docker logs -f --timestamps cab-ride-service
```

### Health Status
```bash
docker-compose ps

# Expected:
# NAME                    STATUS
# cab-mongodb-ride       Up (healthy)
# cab-ride-service       Up (healthy)
# cab-rabbitmq           Up (healthy)
# cab-redis              Up (healthy)
```

---

## ☸️ Kubernetes Deployment

### Prerequisites
```bash
# Create namespace
kubectl create namespace cab-system

# Create secrets (update values)
kubectl create secret generic cab-secrets \
  --from-literal=mongodb-ride-uri='mongodb://admin:admin123@mongodb:27017/ride_db' \
  --from-literal=rabbitmq-url='amqp://admin:admin123@rabbitmq:5672' \
  -n cab-system
```

### Deploy
```bash
# Build and push Docker image
docker build -t your-registry/ride-service:v1.0 ./services/ride-service
docker push your-registry/ride-service:v1.0

# Apply deployment
kubectl apply -f k8s/ride-service-deployment.yaml

# Verify
kubectl get pods -n cab-system
kubectl logs -f pod/ride-service-xxxxx -n cab-system
```

### Scale
```bash
# Auto-scaling enabled (2-5 replicas based on CPU/memory)
kubectl get hpa -n cab-system

# Manual scaling
kubectl scale deployment ride-service --replicas=3 -n cab-system
```

---

## 📈 Monitoring & Observability

### Prometheus Metrics
```bash
curl http://localhost:3007/metrics

# Metrics include:
# - http_requests_total
# - http_request_duration_seconds
# - mongodb_operations_total
# - event_published_total
```

### Jaeger Tracing
```bash
# Access at http://localhost:16686
# View traces for:
# - API requests
# - RabbitMQ event handling
# - MongoDB operations
```

### RabbitMQ Management
```bash
# Access at http://localhost:15672
# Credentials: admin / admin123
# View:
# - Queues: ride-service-booking-queue
# - Messages: Events flow
# - Connections: Active subscribers
```

### Redis CLI
```bash
# Connect to Redis
redis-cli

# View geo data
KEYS drivers
GEOPOS drivers {driverId}
GEODIST drivers {driver1} {driver2} km
```

---

## 🔐 Security Considerations

### Authentication
- ✓ JWT tokens required for all endpoints
- ✓ Tokens validated against Auth Service
- ✓ Token refresh mechanism implemented

### Database
- ✓ MongoDB authentication enabled
- ✓ Database per service pattern (separate ride_db)
- ✓ Indexes optimized for queries

### Event Bus
- ✓ RabbitMQ credentials secured
- ✓ Messages persisted in durable queues
- ✓ Topic exchange routing prevents unauthorized access

### Encryption
- ✓ HTTPS recommended for production
- ✓ Secrets managed via Kubernetes secrets or Vault
- ✓ Sensitive data not logged

---

## 🐛 Troubleshooting

### Ride not created after booking
```bash
# 1. Check RabbitMQ queue
docker logs cab-rabbitmq | grep ride-service-booking-queue

# 2. Check Ride Service logs
docker logs cab-ride-service

# 3. Verify MongoDB connection
docker exec cab-mongodb-ride mongosh --eval "db.adminCommand('ping')"

# 4. Check event handlers
# Look for: "Event received: booking.created"
```

### Location updates not syncing
```bash
# 1. Verify Redis connection
redis-cli ping  # Should return PONG

# 2. Check WebSocket connection
# In browser console: socket.connected

# 3. Verify Redis Geo data
redis-cli
KEYS drivers
GEOPOS drivers {driverId}
```

### Service won't start
```bash
# 1. Check dependencies installed
npm ls  # In services/ride-service/

# 2. Verify environment variables
docker exec cab-ride-service env | grep NODE_ENV

# 3. Check port availability
lsof -i :3007

# 4. Review full logs with errors
docker logs cab-ride-service --tail=100
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| [RIDE_SERVICE_COMPLETE.md](docs/RIDE_SERVICE_COMPLETE.md) | Comprehensive implementation guide |
| [POSTMAN_COLLECTION.json](docs/POSTMAN_COLLECTION.json) | API testing collection |
| [EVENT_DRIVEN_ARCHITECTURE.md](docs/EVENT_DRIVEN_ARCHITECTURE.md) | Event system overview |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment guide |

---

## ✅ Implementation Checklist

- [x] Ride Service scaffolding
- [x] MongoDB schema + indexes
- [x] Express API routes (GET /api/rides, GET /api/rides/:id)
- [x] RabbitMQ event listeners
- [x] Event handlers (booking → ride creation)
- [x] WebSocket integration for GPS
- [x] Redis Geo commands
- [x] Authentication middleware
- [x] Error handling
- [x] Dockerfile + Docker Compose
- [x] Kubernetes manifests
- [x] Postman collection
- [x] End-to-end tests
- [x] Documentation

---

## 🎯 Next Steps

1. **Deploy to Production**
   - Build Docker images for your registry
   - Deploy to Kubernetes cluster
   - Configure ingress for domain

2. **Integrate ETA Service**
   - Implement ETA calculations
   - Update live ETAs based on GPS
   - Send push notifications

3. **Add Surge Pricing**
   - Implement dynamic pricing
   - Update fares based on demand
   - Notify customers of price changes

4. **Analytics Dashboard**
   - Track ride metrics
   - Generate reports
   - Monitor system health

5. **Mobile App Integration**
   - Push notifications
   - Real-time GPS tracking
   - In-app chat/support

---

## 👥 Support & Contribution

For issues, feature requests, or contributions:

1. Check existing issues in the documentation
2. Review the troubleshooting section
3. Check RabbitMQ/MongoDB logs
4. Verify Docker containers are healthy

---

## 📝 License & Credits

This CAB Booking System is part of the **DHHTTT18-N13** coursework at Industrial University of HoChiMinh City (IUH).

**Architecture by**: Mr. Huynh Nam  
**Email**: giangdayit@gmail.com

---

## 📞 Contact

For technical support regarding the Ride Service implementation:
- Review: `docs/RIDE_SERVICE_COMPLETE.md`
- Test: `scripts/test-complete.js`
- Deploy: `docker-compose up -d`

---

**Last Updated**: January 2025  
**Status**: ✓ Production Ready  
**Version**: 1.0.0
