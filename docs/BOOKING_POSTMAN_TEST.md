# Booking Service - Docker + Postman Test

## 1) Start required containers

Run only the services required by booking flow:

```bash
docker compose up -d mongodb-auth mongodb-booking redis rabbitmq auth-service booking-service
```

Booking service URL:
- `http://localhost:3002`

Auth service URL:
- `http://localhost:3001`

## 2) Create test users

### Customer
`POST http://localhost:3001/api/auth/register`

```json
{
  "name": "Customer A",
  "email": "customer.a@example.com",
  "password": "123456",
  "phone": "0900000001",
  "role": "customer"
}
```

### Driver 1
`POST http://localhost:3001/api/auth/register`

```json
{
  "name": "Driver One",
  "email": "driver.one@example.com",
  "password": "123456",
  "phone": "0900000002",
  "role": "driver"
}
```

### Driver 2
`POST http://localhost:3001/api/auth/register`

```json
{
  "name": "Driver Two",
  "email": "driver.two@example.com",
  "password": "123456",
  "phone": "0900000003",
  "role": "driver"
}
```

Save all `accessToken` values.

## 3) Create booking (customer token)

`POST http://localhost:3002/api/bookings`

Header:
- `Authorization: Bearer <CUSTOMER_TOKEN>`

Body:

```json
{
  "pickupLocation": {
    "address": "123 Main St",
    "coordinates": { "lat": 10.762622, "lng": 106.660172 }
  },
  "dropoffLocation": {
    "address": "456 Oak Ave",
    "coordinates": { "lat": 10.7769, "lng": 106.7009 }
  },
  "vehicleType": "economy"
}
```

Save `bookingId = data._id`.

## 4) Test race condition for accept booking

Send 2 requests nearly at the same time:

- `POST http://localhost:3002/api/bookings/{bookingId}/accept`
  - `Authorization: Bearer <DRIVER_1_TOKEN>`
- `POST http://localhost:3002/api/bookings/{bookingId}/accept`
  - `Authorization: Bearer <DRIVER_2_TOKEN>`

Expected:
- exactly 1 request returns success
- the other request returns `400` with message like: `Booking is already accepted`

## 5) Test status transitions (assigned driver token)

`PATCH http://localhost:3002/api/bookings/{bookingId}/status`

Body sequence:

```json
{ "status": "arrived" }
```

```json
{ "status": "in_progress" }
```

```json
{ "status": "completed" }
```

Expected:
- only the assigned driver can update these statuses
- invalid transitions return `400`

## 6) Test cancel behavior

Create another booking, then:

`POST http://localhost:3002/api/bookings/{bookingId}/cancel`

Body:

```json
{ "reason": "Customer changed plan" }
```

Expected:
- only booking customer, assigned driver, or admin can cancel
- completed/cancelled bookings cannot be cancelled again
