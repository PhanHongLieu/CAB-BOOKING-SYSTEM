# CAB Booking System - Event-Driven Microservices Architecture

Hệ thống đặt xe Taxi được xây dựng theo kiến trúc **Event-Driven Microservices**, kết nối khách hàng – tài xế – nhà vận hành theo thời gian thực.

## 🎯 Tính năng chính

- ✅ **Đặt xe** - Quản lý booking real-time
- ✅ **Định vị GPS real-time** - Tracking vị trí tài xế và khách hàng
- ✅ **Ghép tài xế thông minh** - Tự động tìm tài xế gần nhất
- ✅ **Thanh toán** - Xử lý thanh toán đa phương thức
- ✅ **Đánh giá & quản trị** - Hệ thống rating và quản lý

## 🏗️ Kiến trúc

### Event-Driven Architecture
- **RabbitMQ** - Event Bus cho async communication
- **Database per Service** - Mỗi service có database riêng
- **Stateless Services** - Services không lưu trữ state
- **Async-first** - Xử lý bất đồng bộ qua events

## 🏗️ Kiến trúc Tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React.js)                    │
│                    Port: 3000                                │
└──────────────────────────┬────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway                             │
│                    Port: 8000                                │
└──────────────────────────┬────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Auth Service │  │Booking Service│  │Driver Service│
│   Port: 3001 │  │   Port: 3002 │  │   Port: 3003 │
│ MongoDB Auth │  │MongoDB Booking│  │MongoDB Driver│
└──────────────┘  └──────────────┘  └──────────────┘
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│Payment Service│  │Notification │  │Location      │
│   Port: 3004 │  │   Port: 3005 │  │   Port: 3006 │
│MongoDB Payment│  │MongoDB Notif │  │   Redis      │
└──────────────┘  └──────────────┘  └──────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │   RabbitMQ Event Bus   │
              │      Port: 5672        │
              └────────────────────────┘
```

## 📦 Microservices

1. **Auth Service** - Xác thực và phân quyền (JWT)
2. **Booking Service** - Quản lý đặt xe
3. **Driver Service** - Quản lý tài xế
4. **Payment Service** - Xử lý thanh toán
5. **Notification Service** - Thông báo real-time (WebSocket + Events)
6. **Location Service** - Theo dõi vị trí real-time (WebSocket)

## 🛠️ Công nghệ sử dụng

### Backend
- Node.js + Express.js
- MongoDB (Mongoose) - **Database per Service**
- Redis (Caching)
- RabbitMQ (Event Bus)
- Socket.io (Real-time communication)
- JWT (Authentication)
- Docker & Kubernetes

### Frontend
- React.js 18+
- React Router
- Redux Toolkit (State Management)
- Socket.io-client (Real-time)
- Axios (HTTP Client)
- Material-UI

### Infrastructure
- **Docker & Docker Compose** - Containerization
- **Kubernetes** - Orchestration
- **RabbitMQ** - Event Bus (Event-Driven Architecture)
- **MongoDB** - Database (Database per Service)
- **Redis** - Cache
- **Prometheus** - Metrics Collection
- **Grafana** - Metrics Visualization
- **Jaeger** - Distributed Tracing

## 🚀 Quick Start

### Development với Docker Compose

```bash
# Start tất cả services
docker-compose up -d

# Xem logs
docker-compose logs -f

# Stop tất cả services
docker-compose down
```

### Development Local

```bash
# Install dependencies cho từng service
cd services/auth-service && npm install
cd services/booking-service && npm install
# ... tương tự cho các services khác

# Start MongoDB, Redis, RabbitMQ
docker-compose up -d mongodb-auth mongodb-booking redis rabbitmq

# Start từng service (terminal riêng)
cd services/auth-service && npm run dev
cd services/booking-service && npm run dev
# ...

# Start frontend
cd frontend && npm install && npm start
```

## 📁 Cấu trúc Project

```
cab-booking-system/
├── services/                 # Backend Microservices
│   ├── auth-service/
│   ├── booking-service/
│   ├── driver-service/
│   ├── payment-service/
│   ├── notification-service/
│   └── location-service/
├── frontend/                # React.js Frontend
├── api-gateway/             # API Gateway
├── shared/                  # Shared utilities
│   ├── eventBus.js         # RabbitMQ Event Bus
│   ├── events.js           # Event definitions
│   ├── metrics.js          # Prometheus metrics
│   └── tracing.js          # Jaeger tracing
├── monitoring/              # Monitoring configs
│   ├── prometheus.yml
│   └── grafana/
├── docker-compose.yml       # Docker Compose config
├── k8s/                     # Kubernetes manifests
└── docs/                    # Documentation
```

## 🔐 Security Features (Zero Trust)

- **JWT Authentication & Authorization** - Token-based auth
- **Password hashing** - Bcrypt với salt rounds
- **Rate limiting** - API Gateway level
- **CORS configuration** - Strict CORS policies
- **Input validation** - Express-validator
- **Helmet.js** - Security headers
- **Service-to-Service Auth** - Internal service authentication

## 📊 Observability (Observability by Design)

- **Prometheus** - Metrics collection tại `/metrics` endpoint
- **Grafana** - Dashboards và visualization (http://localhost:3001)
- **Jaeger** - Distributed tracing (http://localhost:16686)
- **Centralized Logging** - Winston logger với structured logs
- **Health Checks** - `/health` endpoint trên mỗi service
- **Event Metrics** - Track events published/consumed

## 🎯 Nguyên tắc Kiến trúc

- ✅ **Database per Service** - Mỗi service có database riêng
- ✅ **Stateless Services** - Không lưu trữ state
- ✅ **Async-first** - Event-driven communication
- ✅ **Zero Trust Security** - Xác thực mọi request
- ✅ **Observability by Design** - Metrics, logs, tracing tích hợp sẵn

## 🌐 Deployment

### Docker Swarm
```bash
docker stack deploy -c docker-compose.yml cab-booking
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

## 📝 Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - Chi tiết kiến trúc hệ thống
- [Event-Driven Architecture](docs/EVENT_DRIVEN_ARCHITECTURE.md) - Event patterns và flows
- [API Documentation](docs/API.md) - API endpoints và examples
- [Deployment Guide](docs/DEPLOYMENT.md) - Hướng dẫn triển khai

## 🔄 Event-Driven Flow Example

```
1. Customer tạo booking
   → Booking Service publishes: booking.created

2. Driver Service nhận event
   → Tìm nearby drivers
   → Publishes: driver.nearby.found

3. Notification Service nhận event
   → Gửi notification cho drivers
   → Publishes: notification.sent

4. Driver accept booking
   → Booking Service publishes: booking.accepted

5. Payment Service nhận booking.completed
   → Tạo payment
   → Publishes: payment.completed
```

## 🚀 Quick Access

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **RabbitMQ Management**: http://localhost:15672 (admin/admin123)
- **Grafana**: http://localhost:3001 (admin/admin123)
- **Jaeger UI**: http://localhost:16686
- **Prometheus**: http://localhost:9090

## 🤝 Contributing

1. Fork the project
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT License
