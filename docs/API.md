# API Documentation

Base URL: `http://localhost:8000/api`

## Authentication

### Register
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "0123456789",
  "role": "customer"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "customer"
    },
    "accessToken": "jwt-token",
    "refreshToken": "refresh-token"
  }
}
```

## Bookings

### Create Booking
```http
POST /bookings
Authorization: Bearer <token>
Content-Type: application/json

{
  "pickupLocation": {
    "address": "123 Main St",
    "coordinates": {
      "lat": 10.762622,
      "lng": 106.660172
    }
  },
  "dropoffLocation": {
    "address": "456 Oak Ave",
    "coordinates": {
      "lat": 10.7769,
      "lng": 106.7009
    }
  },
  "vehicleType": "economy"
}
```

### Get Bookings
```http
GET /bookings?page=1&limit=10&status=pending
Authorization: Bearer <token>
```

### Get Booking Details
```http
GET /bookings/:id
Authorization: Bearer <token>
```

### Accept Booking (Driver)
```http
POST /bookings/:id/accept
Authorization: Bearer <token>
```

### Update Booking Status
```http
PATCH /bookings/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_progress"
}
```

## Drivers

### Register Driver
```http
POST /drivers/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "licenseNumber": "DL123456",
  "vehicle": {
    "make": "Toyota",
    "model": "Camry",
    "year": 2020,
    "color": "White",
    "licensePlate": "ABC-123",
    "vehicleType": "comfort"
  }
}
```

### Get Nearby Drivers
```http
GET /drivers/nearby?lat=10.762622&lng=106.660172&radius=5
```

### Update Driver Location
```http
POST /drivers/location
Authorization: Bearer <token>
Content-Type: application/json

{
  "lat": 10.762622,
  "lng": 106.660172
}
```

### Update Driver Status
```http
PATCH /drivers/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "isOnline": true,
  "isAvailable": true
}
```

## Payments

### Create Payment
```http
POST /payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookingId": "booking-id",
  "paymentMethod": "card",
  "paymentGateway": "vnpay"
}
```

### Get Payments
```http
GET /payments?page=1&limit=10
Authorization: Bearer <token>
```

## Notifications

### Get Notifications
```http
GET /notifications?page=1&limit=20&unreadOnly=true
Authorization: Bearer <token>
```

### Mark as Read
```http
PATCH /notifications/:id/read
Authorization: Bearer <token>
```

## WebSocket Events

### Notification Service
- **Connect**: `socket.io-client` connects to notification service
- **Join**: `socket.emit('join', userId)`
- **Receive**: `socket.on('notification', (data) => {...})`

### Location Service
- **Start Tracking**: `socket.emit('start_tracking', { bookingId, userId, userType })`
- **Update Location**: `socket.emit('update_location', { bookingId, userId, coordinates })`
- **Receive Update**: `socket.on('location_update', (data) => {...})`

## Error Responses

```json
{
  "success": false,
  "error": "Error message"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
