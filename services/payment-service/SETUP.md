# Payment Service Setup Guide

## Quick Start

The payment service has been configured with **PostgreSQL** and **RabbitMQ**. Follow these steps to run it.

### 1. Prerequisites

Ensure you have the following installed:
- Docker and Docker Compose
- Node.js 18+ (for local development)
- npm

### 2. Installation

```bash
# Navigate to payment-service directory
cd services/payment-service

# Install dependencies
npm install
```

### 3. Environment Configuration

Copy the environment template and configure if needed:

```bash
cp .env.example .env
```

The default configuration in docker-compose.yml will be used automatically.

### 4. Start Services

Start all services including PostgreSQL and RabbitMQ:

```bash
# From project root
docker-compose up -d

# Or rebuild and start
docker-compose up --build
```

Verify services are running:
```bash
docker-compose ps
```

### 5. Database Setup

#### Option A: Automatic Sync (Development)
The application automatically syncs the database schema on startup.

#### Option B: Manual Migrations (Production-Ready)

```bash
# Run migrations
npm run migrate

# Undo last migration
npm run migrate:undo

# Seed sample data (optional)
npm run seed
```

### 6. Access the Service

The payment service runs on **http://localhost:3004**

**Health Check:**
```bash
curl http://localhost:3004/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "payment-service",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 7. API Testing

#### Local Development

Create a payment:
```bash
curl -X POST http://localhost:3004/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "bookingId": "booking-123",
    "paymentMethod": "card",
    "paymentGateway": "vnpay"
  }'
```

Get all payments:
```bash
curl http://localhost:3004/api/payments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Get specific payment:
```bash
curl http://localhost:3004/api/payments/PAYMENT_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Process refund:
```bash
curl -X POST http://localhost:3004/api/payments/PAYMENT_ID/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 100000,
    "reason": "Customer cancellation"
  }'
```

### 8. Monitoring

**Prometheus Metrics:**
- URL: http://localhost:9090
- Payment metrics: http://localhost:3004/metrics

**Grafana Dashboard:**
- URL: http://localhost:3001 (admin:admin123)
- Access payment service metrics

**Jaeger Tracing:**
- URL: http://localhost:16686
- Search for `payment-service` operations

**RabbitMQ Management:**
- URL: http://localhost:15672 (admin:admin123)
- Monitor payment events queue

### 9. Database Access

Connect to PostgreSQL directly:

```bash
# Using psql (if installed)
psql -h localhost -U admin -d payment_db

# Or using Docker
docker exec -it cab-postgres-payment psql -U admin -d payment_db
```

**Useful SQL Commands:**

```sql
-- View all payments
SELECT * FROM payments;

-- View payment count by status
SELECT status, COUNT(*) FROM payments GROUP BY status;

-- View recent payments
SELECT * FROM payments ORDER BY createdAt DESC LIMIT 10;

-- View payment by customer
SELECT * FROM payments WHERE customerId = 'user-001';
```

### 10. Development Mode

For development with hot reload:

```bash
npm run dev
```

The service will restart automatically on file changes.

### 11. Troubleshooting

#### PostgreSQL Connection Error
```bash
# Check PostgreSQL container
docker logs cab-postgres-payment

# Verify connection
docker exec cab-postgres-payment pg_isready -U admin
```

#### RabbitMQ Connection Error
```bash
# Check RabbitMQ container
docker logs cab-rabbitmq

# Access RabbitMQ management console
http://localhost:15672
```

#### Service Won't Start
```bash
# View service logs
docker logs cab-payment-service

# Or locally
npm run dev  # See error details
```

### 12. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Payment Service                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │     Express Server (Port 3004)                  │  │
│  │  ✓ Payment Management Routes                     │  │
│  │  ✓ Health Check & Metrics                        │  │
│  └──────────────────────────────────────────────────┘  │
│                      │                                   │
│        ┌─────────────┼─────────────┐                   │
│        ▼             ▼             ▼                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │PostgreSQL│  │ RabbitMQ │  │  Redis   │            │
│  │ Port 5432│  │ Port 5672│  │ Port 6379│            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                        │
│  ┌──────────────────────────────────────┐            │
│  │  External Services                   │            │
│  │  • Auth Service (3001)               │            │
│  │  • Booking Service (3002)            │            │
│  │  • Payment Gateways                  │            │
│  └──────────────────────────────────────┘            │
│                                                        │
└─────────────────────────────────────────────────────────┘
```

### 13. Next Steps

1. **Connect Payment Gateways**:
   - Configure Stripe, VNPay, or Momo API keys in `.env`
   - Implement actual payment processing in controller

2. **Add Payment Webhooks**:
   - Create webhook endpoints for payment gateway confirmations
   - Update payment status based on webhook

3. **Implement Caching**:
   - Add Redis caching for frequently accessed payments
   - Cache payment status for optimization

4. **Add Authentication**:
   - Strengthen JWT validation
   - Implement role-based access control

5. **Production Deployment**:
   - Use Kubernetes manifests in `k8s/` directory
   - Configure production environment variables
   - Set up backup strategies for PostgreSQL

### 14. Contact & Support

For issues or questions:
1. Check service logs: `docker logs cab-payment-service`
2. Review README.md for detailed documentation
3. Check shared services configuration in `/shared` directory
4. Verify Docker networking: `docker network inspect cab-network`

## Payment Service Components

### Files Structure

```
payment-service/
├── config/
│   ├── database.js           # Sequelize connection
│   └── sequelize-config.js   # Migration config
├── controllers/
│   └── payment.controller.js # Payment API logic
├── database/
│   ├── init.js               # Database initialization
│   ├── migrations/           # Database migrations
│   └── seeders/              # Sample data
├── events/
│   └── eventHandlers.js      # RabbitMQ event handlers
├── middleware/
│   ├── auth.middleware.js    # JWT authentication
│   └── errorHandler.js       # Error handling
├── models/
│   └── Payment.model.js      # Sequelize Payment model
├── routes/
│   └── payment.routes.js     # API routes
├── server.js                 # Express server
├── package.json              # Dependencies
├── Dockerfile                # Container image
├── .env.example              # Environment template
├── .sequelizerc               # Migration config
└── README.md                 # Documentation
```

## Database Schema

The `payments` table includes:
- **Transactional integrity**: ACID compliance
- **Optimized indexes**: For fast queries
- **JSONB fields**: For flexible metadata storage
- **Enum types**: For valid status values
- **Timestamps**: Automatic created/updated tracking

## Event Flow

```
Booking Created
    ↓
Event: booking:completed (RabbitMQ)
    ↓
Payment Service receives event
    ↓
Payment record created (PostgreSQL)
    ↓
Event: payment:initiated (RabbitMQ)
    ↓
Customer initiates payment
    ↓
Payment processed
    ↓
Event: payment:completed (RabbitMQ)
    ↓
Other services notified
```

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Database**: PostgreSQL  
**Message Queue**: RabbitMQ
