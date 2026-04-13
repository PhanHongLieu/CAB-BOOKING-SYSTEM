# Auth Service Architecture

## Overview

The Auth Service is a microservice responsible for authentication and authorization in the Cab Booking System. It follows **Zero Trust Security** principles and is designed for high availability and scalability.

## System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Cab Booking System                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐            │
│  │  API Gateway │────▶│ Auth Service │◀────│ Other        │            │
│  │              │     │  (This)      │     │ Services     │            │
│  └──────────────┘     └──────────────┘     └──────────────┘            │
│         │                    │                    │                     │
│         │                    ▼                    │                     │
│         │             ┌──────────────┐           │                     │
│         │             │  PostgreSQL  │           │                     │
│         │             │  (Users)     │           │                     │
│         │             └──────────────┘           │                     │
│         │                    │                    │                     │
│         │                    ▼                    │                     │
│         │             ┌──────────────┐           │                     │
│         └────────────▶│    Redis     │◀──────────┘                     │
│                       │  (Cache)     │                                  │
│                       └──────────────┘                                  │
│                              │                                          │
│                              ▼                                          │
│                       ┌──────────────┐                                  │
│                       │  RabbitMQ    │                                  │
│                       │  (Events)    │                                  │
│                       └──────────────┘                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Runtime | Node.js | 18+ | JavaScript runtime |
| Framework | Express.js | 4.x | HTTP server |
| Database | PostgreSQL | 15+ | Primary data store |
| ORM | Prisma | 5.x | Database access |
| Cache | Redis | 7+ | Token blacklist, rate limiting |
| Message Queue | RabbitMQ | 3.12+ | Event publishing |
| Logging | Winston | 3.x | Structured logging |
| Testing | Jest | 29.x | Unit & integration tests |

## Directory Structure

```
auth-service/
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma          # Prisma schema definition
│   ├── seed.js                # Database seeding script
│   └── migrations/            # Database migrations
│
├── src/
│   ├── config/                # Configuration modules
│   │   ├── database.config.js # PostgreSQL/Prisma setup
│   │   ├── redis.config.js    # Redis connection & utilities
│   │   ├── rabbitmq.config.js # RabbitMQ connection & events
│   │   ├── security.config.js # Security settings
│   │   └── index.js           # Config exports
│   │
│   ├── controllers/           # HTTP request handlers
│   │   └── auth.controller.js # Auth endpoint handlers
│   │
│   ├── middleware/            # Express middleware
│   │   ├── auth.middleware.js       # JWT verification
│   │   ├── authorize.middleware.js  # Role-based access
│   │   ├── errorHandler.middleware.js
│   │   ├── rateLimiter.middleware.js
│   │   └── index.js
│   │
│   ├── routes/                # API route definitions
│   │   └── auth.routes.js     # /api/v1/auth routes
│   │
│   ├── services/              # Business logic layer
│   │   ├── auth.service.js    # Core auth operations
│   │   └── token.service.js   # Token management
│   │
│   ├── utils/                 # Utility functions
│   │   ├── bcrypt.util.js     # Password hashing
│   │   ├── jwt.util.js        # Token operations
│   │   ├── validators.util.js # Input validation
│   │   ├── errors.util.js     # Custom error classes
│   │   ├── logger.util.js     # Winston logger
│   │   ├── asyncHandler.util.js
│   │   └── index.js
│   │
│   ├── server.js              # Application entry point
│   └── swagger.js             # API documentation config
│
├── docs/                      # Documentation
├── tests/                     # Test files (Phase 5)
├── .env                       # Environment variables
├── .env.example               # Environment template
├── docker-compose.yml         # Docker services
├── Dockerfile                 # Container build
└── package.json               # Dependencies
```

## Data Flow

### Authentication Flow

```
┌────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│ Client │────▶│ Rate Limiter│────▶│ Validator   │────▶│ Controller│
└────────┘     └─────────────┘     └─────────────┘     └──────────┘
                                                              │
                                                              ▼
┌────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│ Client │◀────│ Response    │◀────│ JWT Gen     │◀────│ Service  │
└────────┘     └─────────────┘     └─────────────┘     └──────────┘
                                                              │
                                                              ▼
                                                       ┌──────────┐
                                                       │ Database │
                                                       └──────────┘
```

### Token Verification Flow

```
┌────────┐     ┌─────────────┐     ┌─────────────┐     ┌──────────┐
│ Client │────▶│ Extract     │────▶│ Blacklist   │────▶│ Verify   │
│        │     │ Token       │     │ Check(Redis)│     │JWT       │
└────────┘     └─────────────┘     └─────────────┘     └──────────┘
                                                              │
                                                              ▼
                                                       ┌──────────┐
                                                       │ Attach   │
                                                       │ User     │
                                                       └──────────┘
```

## Design Decisions

### 1. Separate Access and Refresh Tokens

**Decision**: Use short-lived access tokens (15 min) and long-lived refresh tokens (7 days).

**Rationale**: 
- Access tokens are frequently used and should be short-lived to limit exposure
- Refresh tokens allow seamless re-authentication without credentials
- If access token is compromised, damage is limited to 15 minutes

### 2. Token Rotation

**Decision**: Rotate refresh tokens on each use.

**Rationale**:
- Limits the usefulness of a stolen refresh token
- Enables detection of token reuse (potential attack)
- Improves security posture significantly

### 3. Password History

**Decision**: Prevent reuse of last 5 passwords.

**Rationale**:
- Prevents users from cycling through passwords
- Increases overall password security
- Common security compliance requirement

### 4. Redis for Token Blacklist

**Decision**: Use Redis instead of database for token blacklisting.

**Rationale**:
- Fast O(1) lookups
- Automatic TTL-based expiration
- Reduces database load
- Suitable for distributed systems

### 5. Prisma ORM

**Decision**: Use Prisma instead of raw SQL or other ORMs.

**Rationale**:
- Type-safe database access
- Automatic migrations
- Clear schema definition
- Excellent developer experience

## Error Handling Strategy

All errors flow through centralized error handler:

```javascript
// Custom error classes with HTTP status codes
AppError (base)
├── ValidationError (400)
├── UnauthorizedError (401)
├── InvalidCredentialsError (401)
├── InvalidTokenError (401)
├── ForbiddenError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── AccountLockedError (423)
├── TooManyRequestsError (429)
└── InternalServerError (500)
```

## Event Publishing

Auth Service publishes events to RabbitMQ for other services:

| Event | Routing Key | Consumers |
|-------|-------------|-----------|
| User Registered | `user.registered` | Notification Service |
| User Logged In | `user.logged_in` | Analytics Service |
| User Logged Out | `user.logged_out` | - |
| Password Changed | `user.password_changed` | Notification Service |
| Failed Login | `security.failed_login` | Security Service |
| Account Locked | `security.account_locked` | Notification, Security |

## Scalability Considerations

1. **Stateless Design**: No session state on server; all state in DB/Redis
2. **Connection Pooling**: Prisma manages database connection pool
3. **Redis Clustering**: Ready for Redis Cluster in production
4. **Horizontal Scaling**: Multiple instances behind load balancer
5. **Health Checks**: Ready for Kubernetes deployment
