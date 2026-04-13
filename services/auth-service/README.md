# Auth Service - Cab Booking System

Authentication and Authorization Service for the Cab Booking System using Zero Trust Security architecture.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- RabbitMQ 3.12+ (optional)

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Create database and run migrations
npm run prisma:migrate

# Seed the database (optional)
npm run prisma:seed

# Start development server
npm run dev
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens

## 📁 Project Structure

```
src/
├── config/          # Configuration files
│   ├── database.config.js
│   ├── redis.config.js
│   ├── rabbitmq.config.js
│   └── security.config.js
├── controllers/     # Route handlers
│   └── auth.controller.js
├── middleware/      # Express middleware
│   ├── auth.middleware.js
│   ├── authorize.middleware.js
│   ├── errorHandler.middleware.js
│   └── rateLimiter.middleware.js
├── routes/          # API routes
│   └── auth.routes.js
├── services/        # Business logic
│   ├── auth.service.js
│   └── token.service.js
├── utils/           # Utility functions
│   ├── bcrypt.util.js
│   ├── jwt.util.js
│   ├── validators.util.js
│   ├── errors.util.js
│   └── logger.util.js
├── server.js        # Application entry point
└── swagger.js       # API documentation
```

## 🔐 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/logout` | Logout user (protected) |
| POST | `/api/v1/auth/refresh-token` | Refresh access token |
| GET | `/api/v1/auth/me` | Get current user (protected) |

### Password Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| POST | `/api/v1/auth/change-password` | Change password (protected) |

### Email Verification

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/verify-email` | Verify email address |
| POST | `/api/v1/auth/resend-verification` | Resend verification email (protected) |

## 📊 Health Checks

- `GET /health` - Full health check with all dependencies
- `GET /live` - Liveness probe for Kubernetes
- `GET /ready` - Readiness probe for Kubernetes

## 📚 API Documentation

Swagger documentation is available at: `http://localhost:3001/api-docs`

## 🔒 Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: Short-lived access tokens (15min), long-lived refresh tokens (7 days)
- **Token Rotation**: Refresh tokens are rotated on each use
- **Rate Limiting**: Login (5/15min), API (100/15min), Password Reset (3/hour)
- **Account Lockout**: After 5 failed login attempts, account is locked for 1 hour
- **Password History**: Last 5 passwords cannot be reused
- **Token Blacklisting**: Access tokens can be revoked via Redis

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Start development server with hot reload |
| `npm test` | Run tests |
| `npm run lint` | Run ESLint |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run database migrations |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run prisma:seed` | Seed the database |

## 🐳 Docker

```bash
# Build image
docker build -t auth-service .

# Run with Docker Compose
docker-compose up -d
```

## 📝 License

MIT
