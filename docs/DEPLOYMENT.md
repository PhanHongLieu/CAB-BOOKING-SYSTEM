# Hướng dẫn Triển khai

## Development với Docker Compose

### Yêu cầu
- Docker Desktop hoặc Docker Engine
- Docker Compose

### Các bước

1. **Clone repository**
```bash
git clone <repository-url>
cd cab-booking-system
```

2. **Start services**
```bash
docker-compose up -d
```

3. **Kiểm tra services**
```bash
docker-compose ps
docker-compose logs -f
```

4. **Truy cập ứng dụng**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8000
- MongoDB: localhost:27017
- Redis: localhost:6379

## Production với Kubernetes

### Yêu cầu
- Kubernetes cluster
- kubectl configured
- Docker images đã build và push lên registry

### Các bước

1. **Build Docker images**
```bash
# Build từng service
docker build -t your-registry/cab-booking/auth-service:latest ./services/auth-service
docker build -t your-registry/cab-booking/booking-service:latest ./services/booking-service
# ... tương tự cho các services khác

# Push lên registry
docker push your-registry/cab-booking/auth-service:latest
# ... tương tự
```

2. **Update image names trong Kubernetes manifests**
Chỉnh sửa các file trong `k8s/` để sử dụng image registry của bạn.

3. **Deploy**
```bash
# Tạo namespace
kubectl apply -f k8s/namespace.yaml

# Tạo secrets
kubectl apply -f k8s/secrets.yaml

# Deploy infrastructure
kubectl apply -f k8s/mongodb-deployment.yaml
kubectl apply -f k8s/redis-deployment.yaml

# Deploy services
kubectl apply -f k8s/auth-service-deployment.yaml
kubectl apply -f k8s/booking-service-deployment.yaml
kubectl apply -f k8s/driver-service-deployment.yaml
kubectl apply -f k8s/payment-service-deployment.yaml
kubectl apply -f k8s/notification-service-deployment.yaml
kubectl apply -f k8s/location-service-deployment.yaml

# Deploy API Gateway và Frontend
kubectl apply -f k8s/api-gateway-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

# Deploy Ingress (optional)
kubectl apply -f k8s/ingress.yaml
```

4. **Kiểm tra deployment**
```bash
kubectl get pods -n cab-booking-system
kubectl get services -n cab-booking-system
kubectl logs -f deployment/auth-service -n cab-booking-system
```

## Environment Variables

### Auth Service
- `MONGODB_URI`: MongoDB connection string
- `REDIS_HOST`: Redis host
- `REDIS_PORT`: Redis port
- `JWT_SECRET`: JWT secret key
- `JWT_EXPIRES_IN`: JWT expiration time

### Booking Service
- `MONGODB_URI`: MongoDB connection string
- `AUTH_SERVICE_URL`: Auth service URL
- `DRIVER_SERVICE_URL`: Driver service URL
- `LOCATION_SERVICE_URL`: Location service URL
- `NOTIFICATION_SERVICE_URL`: Notification service URL

### Frontend
- `REACT_APP_API_URL`: API Gateway URL
- `REACT_APP_WS_URL`: WebSocket URL

## Scaling

### Docker Compose
Chỉnh sửa `docker-compose.yml` để tăng replicas (cần external load balancer).

### Kubernetes
```bash
# Scale booking service
kubectl scale deployment booking-service --replicas=5 -n cab-booking-system

# Auto-scaling
kubectl autoscale deployment booking-service --min=2 --max=10 --cpu-percent=80 -n cab-booking-system
```

## Health Checks

Tất cả services có health check endpoint tại `/health`:

```bash
# Test health check
curl http://localhost:8000/health
curl http://localhost:3001/health
```

## Troubleshooting

### Services không start
1. Kiểm tra logs: `docker-compose logs <service-name>`
2. Kiểm tra environment variables
3. Kiểm tra network connectivity

### Database connection issues
1. Kiểm tra MongoDB đã start: `docker-compose ps mongodb`
2. Kiểm tra connection string
3. Kiểm tra credentials

### Kubernetes issues
1. Kiểm tra pods: `kubectl get pods -n cab-booking-system`
2. Xem logs: `kubectl logs <pod-name> -n cab-booking-system`
3. Kiểm tra services: `kubectl get svc -n cab-booking-system`
4. Kiểm tra events: `kubectl get events -n cab-booking-system`
