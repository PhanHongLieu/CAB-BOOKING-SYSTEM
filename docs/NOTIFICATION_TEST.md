# Notification Service Test Guide

## 1. Start required containers

```bash
docker compose up -d --build \
  mongodb-auth auth-service \
  mongodb-notification notification-service \
  rabbitmq redis api-gateway
```

## 2. Health check

```bash
curl http://localhost:3005/health
curl http://localhost:8000/health
```

## 3. Import Postman collection

Import file:

`docs/postman/notification-service.postman_collection.json`

Run requests in order:
1. Auth - Register Customer
2. Auth - Login
3. Notification - Send
4. Notification - Get My Notifications
5. Notification - Mark As Read
6. Notification - Mark All Read

## 4. Verify data in MongoDB

```bash
docker exec -it cab-mongodb-notification mongosh \
  "mongodb://admin:admin123@localhost:27017/notification_db?authSource=admin" \
  --eval "db.notifications.find().sort({createdAt:-1}).limit(5).pretty()"
```

## 5. Test Event-Driven flow (optional)

Start producer services too:

```bash
docker compose up -d --build booking-service payment-service
```

Then trigger booking/payment flows from Postman/API and verify notifications are created in MongoDB.
