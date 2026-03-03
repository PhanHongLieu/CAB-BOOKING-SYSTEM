# Kiến trúc Hệ thống CAB Booking

## Tổng quan

Hệ thống đặt xe Taxi được xây dựng theo kiến trúc Microservices, đảm bảo khả năng mở rộng, chịu lỗi cao, và dễ bảo trì.

## Kiến trúc Microservices

### 1. Auth Service (Port 3001)
- **Chức năng**: Xác thực và phân quyền người dùng
- **Database**: MongoDB (User collection)
- **API chính**:
  - POST `/api/auth/register` - Đăng ký
  - POST `/api/auth/login` - Đăng nhập
  - POST `/api/auth/refresh-token` - Làm mới token
  - GET `/api/auth/verify` - Xác thực token

### 2. Booking Service (Port 3002)
- **Chức năng**: Quản lý đặt xe
- **Database**: MongoDB (Booking collection)
- **API chính**:
  - POST `/api/bookings` - Tạo booking
  - GET `/api/bookings` - Lấy danh sách bookings
  - GET `/api/bookings/:id` - Lấy chi tiết booking
  - POST `/api/bookings/:id/accept` - Tài xế chấp nhận booking
  - PATCH `/api/bookings/:id/status` - Cập nhật trạng thái

### 3. Driver Service (Port 3003)
- **Chức năng**: Quản lý tài xế
- **Database**: MongoDB (Driver collection)
- **API chính**:
  - POST `/api/drivers/register` - Đăng ký tài xế
  - GET `/api/drivers/nearby` - Tìm tài xế gần nhất
  - POST `/api/drivers/location` - Cập nhật vị trí
  - PATCH `/api/drivers/status` - Cập nhật trạng thái

### 4. Payment Service (Port 3004)
- **Chức năng**: Xử lý thanh toán
- **Database**: MongoDB (Payment collection)
- **API chính**:
  - POST `/api/payments` - Tạo thanh toán
  - GET `/api/payments` - Lấy lịch sử thanh toán
  - POST `/api/payments/:id/refund` - Hoàn tiền

### 5. Notification Service (Port 3005)
- **Chức năng**: Thông báo real-time
- **Database**: MongoDB (Notification collection)
- **WebSocket**: Socket.io
- **API chính**:
  - POST `/api/notifications/send` - Gửi thông báo
  - GET `/api/notifications` - Lấy thông báo
  - PATCH `/api/notifications/:id/read` - Đánh dấu đã đọc

### 6. Location Service (Port 3006)
- **Chức năng**: Theo dõi vị trí real-time
- **Cache**: Redis (location data)
- **WebSocket**: Socket.io
- **API chính**:
  - POST `/api/location/update` - Cập nhật vị trí
  - GET `/api/location/:userId` - Lấy vị trí

## API Gateway (Port 8000)

- **Chức năng**: Điểm vào duy nhất cho tất cả API requests
- **Tính năng**:
  - Routing requests đến các microservices
  - Rate limiting
  - Authentication middleware
  - Load balancing

## Frontend (Port 3000)

- **Framework**: React.js 18+
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI
- **Real-time**: Socket.io-client

## Database

### MongoDB
- **Collections**:
  - users
  - bookings
  - drivers
  - payments
  - notifications

### Redis
- **Usage**:
  - Caching location data
  - Session storage
  - Message queue

## Communication Patterns

### 1. Synchronous Communication
- HTTP/REST API giữa các services
- API Gateway routing

### 2. Asynchronous Communication
- WebSocket cho real-time updates
- Redis pub/sub (có thể mở rộng)

## Security

1. **Authentication**: JWT tokens
2. **Authorization**: Role-based (customer, driver, admin)
3. **Password**: Bcrypt hashing
4. **Rate Limiting**: API Gateway level
5. **CORS**: Configured per service
6. **Helmet**: Security headers

## Scalability

- **Horizontal Scaling**: Mỗi service có thể scale độc lập
- **Load Balancing**: Kubernetes Service hoặc API Gateway
- **Database Sharding**: MongoDB sharding (có thể mở rộng)
- **Caching**: Redis cho location và session data

## Fault Tolerance

- **Health Checks**: Mỗi service có `/health` endpoint
- **Circuit Breaker**: Có thể tích hợp (Hystrix, Resilience4j)
- **Retry Logic**: HTTP client với retry
- **Graceful Degradation**: Services hoạt động độc lập

## Monitoring & Logging

- **Centralized Logging**: Winston logger
- **Health Endpoints**: `/health` trên mỗi service
- **Metrics**: Có thể tích hợp Prometheus/Grafana

## Deployment

### Docker Compose
- Development environment
- Local testing

### Kubernetes
- Production deployment
- Auto-scaling
- Service discovery
- Load balancing

## Data Flow

### Booking Flow
1. Customer tạo booking → Booking Service
2. Booking Service tìm nearby drivers → Driver Service
3. Booking Service gửi notification → Notification Service
4. Driver accept → Booking Service
5. Driver update location → Location Service
6. Customer track driver → Location Service (WebSocket)
7. Trip complete → Payment Service
8. Payment processed → Booking Service update status

### Real-time Updates
- Location updates qua WebSocket
- Notifications qua Socket.io
- Status changes broadcasted

## Future Enhancements

1. **Message Queue**: RabbitMQ/Kafka cho async processing
2. **Service Mesh**: Istio cho advanced routing
3. **API Gateway**: Kong hoặc AWS API Gateway
4. **Monitoring**: Prometheus + Grafana
5. **Tracing**: Jaeger hoặc Zipkin
6. **CI/CD**: Jenkins, GitLab CI, hoặc GitHub Actions
