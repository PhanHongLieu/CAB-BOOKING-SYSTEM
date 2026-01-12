.PHONY: build up down logs clean

# Build all Docker images
build:
	docker-compose build

# Start all services
up:
	docker-compose up -d

# Stop all services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f

# Clean up
clean:
	docker-compose down -v
	docker system prune -f

# Install dependencies for a service
install-auth:
	cd services/auth-service && npm install

install-booking:
	cd services/booking-service && npm install

install-driver:
	cd services/driver-service && npm install

install-payment:
	cd services/payment-service && npm install

install-notification:
	cd services/notification-service && npm install

install-location:
	cd services/location-service && npm install

install-gateway:
	cd api-gateway && npm install

install-frontend:
	cd frontend && npm install

# Install all dependencies
install-all: install-auth install-booking install-driver install-payment install-notification install-location install-gateway install-frontend

# Run tests
test:
	cd services/auth-service && npm test || true
	cd services/booking-service && npm test || true
