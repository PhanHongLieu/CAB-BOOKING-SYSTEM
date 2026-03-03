# Kubernetes Deployment Guide

## Prerequisites

- Kubernetes cluster (minikube, GKE, EKS, AKS, etc.)
- kubectl configured
- Docker images built and pushed to registry

## Deployment Steps

### 1. Create Namespace

```bash
kubectl apply -f namespace.yaml
```

### 2. Create Secrets

```bash
kubectl apply -f secrets.yaml
```

**Important:** Update the secrets.yaml file with your actual secrets before deploying to production!

### 3. Deploy Infrastructure

```bash
kubectl apply -f mongodb-deployment.yaml
kubectl apply -f redis-deployment.yaml
```

### 4. Deploy Services

```bash
kubectl apply -f auth-service-deployment.yaml
kubectl apply -f booking-service-deployment.yaml
kubectl apply -f driver-service-deployment.yaml
kubectl apply -f payment-service-deployment.yaml
kubectl apply -f notification-service-deployment.yaml
kubectl apply -f location-service-deployment.yaml
```

### 5. Deploy API Gateway and Frontend

```bash
kubectl apply -f api-gateway-deployment.yaml
kubectl apply -f frontend-deployment.yaml
```

### 6. Deploy Ingress (Optional)

```bash
kubectl apply -f ingress.yaml
```

## Build and Push Docker Images

Before deploying, build and push Docker images:

```bash
# Build images
docker build -t cab-booking/auth-service:latest ./services/auth-service
docker build -t cab-booking/booking-service:latest ./services/booking-service
docker build -t cab-booking/driver-service:latest ./services/driver-service
docker build -t cab-booking/payment-service:latest ./services/payment-service
docker build -t cab-booking/notification-service:latest ./services/notification-service
docker build -t cab-booking/location-service:latest ./services/location-service
docker build -t cab-booking/api-gateway:latest ./api-gateway
docker build -t cab-booking/frontend:latest ./frontend

# Push to registry (replace with your registry)
docker tag cab-booking/auth-service:latest your-registry/cab-booking/auth-service:latest
# ... repeat for all services
```

## Scaling

To scale services:

```bash
kubectl scale deployment booking-service --replicas=5 -n cab-booking-system
```

## Monitoring

Check service status:

```bash
kubectl get pods -n cab-booking-system
kubectl get services -n cab-booking-system
kubectl logs -f deployment/auth-service -n cab-booking-system
```

## Health Checks

All services have health check endpoints at `/health`:

```bash
kubectl port-forward svc/api-gateway 8000:8000 -n cab-booking-system
curl http://localhost:8000/health
```
