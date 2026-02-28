# AI Agent Development Prompt - Auth Service

## 🎯 Context & Objective

Bạn là một Senior Backend Engineer chuyên về Microservices Architecture và Security. Nhiệm vụ của bạn là xây dựng **Auth Service** cho hệ thống Cab Booking System theo đúng kiến trúc Zero Trust Security.

## 📋 Project Requirements

### System Architecture
- **Pattern**: Microservices Architecture
- **Security Model**: Zero Trust Security
- **Communication**: RESTful API + Event-Driven (RabbitMQ)
- **Database**: PostgreSQL (for persistence) + Redis (for caching & token blacklist)
- **Container**: Docker + Kubernetes ready
- **Monitoring**: Prometheus + Grafana

### Related Services
1. **API Gateway** - Entry point, routing
2. **Booking Service** - Handles ride bookings
3. **Driver Service** - Manages drivers
4. **Payment Service** - Processes payments
5. **Notification Service** - Sends notifications
6. **Location Service** - Tracks locations

## 🎨 Technical Specifications

### 1. Core Technologies
```javascript
{
  "runtime": "Node.js 18+",
  "framework": "Express.js 4.x",
  "database": "PostgreSQL 15+",
  "orm": "Prisma ORM (recommended)",
  "cache": "Redis 7+",
  "messageQueue": "RabbitMQ 3.12+",
  "testing": "Jest + Supertest",
  "logging": "Winston",
  "monitoring": "Prometheus + prom-client"
}
```

### 2. Security Requirements (CRITICAL)

#### Password Security
- ✅ Bcrypt hashing with 12 salt rounds (NEVER use MD5, SHA1, or plain text)
- ✅ Password complexity: min 8 chars, uppercase, lowercase, number, special char
- ✅ Password history: prevent reuse of last 5 passwords
- ✅ Force password change every 90 days (optional)

#### JWT Configuration
```javascript
{
  "accessToken": {
    "expiresIn": "15m",  // Short-lived for security
    "secret": "JWT_ACCESS_SECRET from env",
    "algorithm": "HS256"
  },
  "refreshToken": {
    "expiresIn": "7d",
    "secret": "JWT_REFRESH_SECRET from env",
    "rotation": true,  // Rotate on each refresh
    "reuseDetection": true  // Detect token replay attacks
  }
}
```

#### Rate Limiting Strategy
```javascript
{
  "loginEndpoint": {
    "windowMs": 900000,  // 15 minutes
    "max": 5,  // 5 attempts
    "skipSuccessfulRequests": true
  },
  "generalAPI": {
    "windowMs": 900000,
    "max": 100
  },
  "passwordReset": {
    "windowMs": 3600000,  // 1 hour
    "max": 3
  }
}
```

#### Account Lockout Policy
- Lock account after 5 failed login attempts
- Lockout duration: 1 hour
- Reset failed attempts counter on successful login
- Notify user via email when account is locked

### 3. API Endpoints Implementation

#### Authentication Endpoints
```javascript
/**
 * POST /api/v1/auth/register
 * Body: { email, password, firstName, lastName, phoneNumber, role }
 * Response: { success, message, userId }
 * Logic:
 *   1. Validate input (email format, password strength, phone format)
 *   2. Check if email/phone already exists
 *   3. Hash password with bcrypt (12 rounds)
 *   4. Create user in PostgreSQL
 *   5. Generate email verification token
 *   6. Send verification email
 *   7. Publish USER_REGISTERED event to RabbitMQ
 *   8. Return success response (don't auto-login)
 */

/**
 * POST /api/v1/auth/login
 * Body: { email, password, twoFactorCode? }
 * Response: { accessToken, refreshToken, user }
 * Logic:
 *   1. Validate input
 *   2. Find user by email
 *   3. Check if account is locked (accountLockedUntil)
 *   4. Verify password with bcrypt.compare()
 *   5. If invalid: increment failedLoginAttempts, lock if >= 5
 *   6. If valid: reset failedLoginAttempts to 0
 *   7. Check if 2FA enabled, verify code if provided
 *   8. Generate access token (15min) + refresh token (7days)
 *   9. Store refresh token in RefreshToken collection
 *   10. Update lastLogin, lastLoginIP in User
 *   11. Store access token hash in Redis for potential blacklisting
 *   12. Publish USER_LOGGED_IN event
 *   13. Return tokens + user info (exclude sensitive fields)
 */

/**
 * POST /api/v1/auth/refresh-token
 * Body: { refreshToken }
 * Response: { accessToken, refreshToken }
 * Logic:
 *   1. Validate refresh token format
 *   2. Verify JWT signature and expiration
 *   3. Check if token exists in RefreshToken collection
 *   4. Check if token is revoked (revokedAt !== null)
 *   5. Find user by userId from token
 *   6. Check if user is still active
 *   7. Generate new access token
 *   8. [Optional] Rotate refresh token (revoke old, create new)
 *   9. Update token metadata (lastUsedAt, usageCount)
 *   10. Return new tokens
 */

/**
 * POST /api/v1/auth/logout
 * Headers: { Authorization: Bearer <accessToken> }
 * Body: { refreshToken? }
 * Response: { success, message }
 * Logic:
 *   1. Verify access token from header
 *   2. Add access token to Redis blacklist (TTL = remaining exp time)
 *   3. If refreshToken provided, revoke it in DB (set revokedAt, revokedByIp)
 *   4. Publish USER_LOGGED_OUT event
 *   5. Return success
 */

/**
 * POST /api/v1/auth/forgot-password
 * Body: { email }
 * Response: { success, message }
 * Logic:
 *   1. Find user by email
 *   2. Generate secure random token (crypto.randomBytes)
 *   3. Hash token and store in user.passwordResetToken
 *   4. Set passwordResetExpires (1 hour from now)
 *   5. Send password reset email with token
 *   6. Publish PASSWORD_RESET_REQUESTED event
 *   7. Return success (don't reveal if email exists)
 */

/**
 * POST /api/v1/auth/reset-password
 * Body: { token, newPassword }
 * Response: { success, message }
 * Logic:
 *   1. Hash provided token
 *   2. Find user with matching passwordResetToken
 *   3. Check if token is expired
 *   4. Validate new password strength
 *   5. Check password history (prevent reuse)
 *   6. Hash new password
 *   7. Update user.password, clear passwordResetToken
 *   8. Set passwordChangedAt to now
 *   9. Revoke all existing refresh tokens
 *   10. Publish PASSWORD_RESET event
 *   11. Send confirmation email
 *   12. Return success
 */
```

#### Protected Endpoints
```javascript
/**
 * POST /api/v1/auth/change-password
 * Headers: { Authorization: Bearer <accessToken> }
 * Body: { currentPassword, newPassword }
 * Response: { success, message }
 * Middleware: authenticate
 * Logic:
 *   1. Verify current password
 *   2. Validate new password strength
 *   3. Check if new password !== current password
 *   4. Check password history
 *   5. Hash and update password
 *   6. Set passwordChangedAt
 *   7. Revoke all refresh tokens except current one
 *   8. Publish PASSWORD_CHANGED event
 *   9. Send notification email
 */

/**
 * GET /api/v1/auth/me
 * Headers: { Authorization: Bearer <accessToken> }
 * Response: { user }
 * Middleware: authenticate
 * Logic:
 *   1. Extract userId from verified JWT
 *   2. Find user in PostgreSQL
 *   3. Return user info (exclude sensitive fields)
 */
```

### 4. Middleware Implementation

#### Authentication Middleware
```javascript
/**
 * authenticate middleware
 * Purpose: Verify JWT and attach user to request
 * Steps:
 *   1. Extract token from Authorization header (Bearer <token>)
 *   2. Check if token is blacklisted in Redis
 *   3. Verify JWT signature and expiration
 *   4. Extract userId from payload
 *   5. Find user in PostgreSQL
 *   6. Check if user is active
 *   7. Attach user object to req.user
 *   8. Call next()
 * Error handling:
 *   - No token: 401 Unauthorized
 *   - Invalid token: 401 Invalid token
 *   - Blacklisted token: 401 Token revoked
 *   - User not found/inactive: 401 User not found
 */
```

#### Authorization Middleware
```javascript
/**
 * authorize(...roles) middleware
 * Purpose: Check if user has required role
 * Steps:
 *   1. Check if req.user exists (must use after authenticate)
 *   2. Check if req.user.role is in allowed roles array
 *   3. If yes: call next()
 *   4. If no: return 403 Forbidden
 * Usage: router.post('/admin-only', authenticate, authorize('admin'), handler)
 */
```

#### Rate Limiter Middleware
```javascript
/**
 * Use express-rate-limit with rate-limit-redis
 * Create different limiters for different endpoints:
 *   - loginLimiter: 5 req/15min per IP
 *   - apiLimiter: 100 req/15min per IP
 *   - passwordResetLimiter: 3 req/hour per IP
 * Store in Redis for distributed rate limiting
 */
```

### 5. Database Schemas

#### User Model (PostgreSQL / Prisma)
```prisma
model User {
  id                  String            @id @default(uuid())
  email               String            @unique
  password            String
  role                Role              @default(CUSTOMER)
  firstName           String
  lastName            String
  phoneNumber         String            @unique
  isEmailVerified     Boolean           @default(false)
  isPhoneVerified     Boolean           @default(false)
  isActive            Boolean           @default(true)
  
  // 2FA
  twoFactorEnabled    Boolean           @default(false)
  twoFactorSecret     String?
  
  // Security tracking
  lastLogin           DateTime?
  lastLoginIP         String?
  failedLoginAttempts Int               @default(0)
  accountLockedUntil  DateTime?
  passwordChangedAt   DateTime?
  passwordResetToken  String?
  passwordResetExpires DateTime?
  // Password history relation
  passwordHistory     PasswordHistory[]
  
  // Service-to-service
  serviceId           String?           @unique
  allowedServices     String[]          // PostgreSQL array
  
  refreshTokens       RefreshToken[]

  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt

  @@index([email])
  @@index([phoneNumber])
  @@index([isActive])
}

enum Role {
  CUSTOMER
  DRIVER
  ADMIN
  SERVICE
}

model PasswordHistory {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  password  String
  changedAt DateTime @default(now())
}
```

#### RefreshToken Model (PostgreSQL / Prisma)
```prisma
model RefreshToken {
  id              String    @id @default(uuid())
  token           String    @unique
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt       DateTime
  createdByIp     String?
  revokedAt       DateTime?
  revokedByIp     String?
  replacedByToken String?   // For token rotation tracking
  isActive        Boolean   @default(true)
  lastUsedAt      DateTime?
  usageCount      Int       @default(0)
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
}
```

### 6. Redis Usage

```javascript
/**
 * Redis Keys Structure:
 * 
 * 1. Token Blacklist
 *    Key: `blacklist:${tokenHash}`
 *    Value: userId
 *    TTL: remaining time until token expiration
 * 
 * 2. Rate Limiting (handled by rate-limit-redis)
 *    Key: `rl:${endpoint}:${identifier}`
 *    Value: request count
 *    TTL: window duration
 * 
 * 3. Session Cache (optional)
 *    Key: `session:${userId}`
 *    Value: JSON.stringify(user data)
 *    TTL: 15 minutes
 */
```

### 7. RabbitMQ Events

```javascript
/**
 * Exchange: cab_booking_events (topic exchange)
 * 
 * Events to Publish:
 * 
 * 1. user.registered
 *    Routing Key: user.registered
 *    Payload: { userId, email, role, firstName, lastName, timestamp }
 *    Consumers: Notification Service (welcome email)
 * 
 * 2. user.logged_in
 *    Routing Key: user.logged_in
 *    Payload: { userId, email, ip, timestamp }
 *    Consumers: Analytics Service
 * 
 * 3. user.logged_out
 *    Routing Key: user.logged_out
 *    Payload: { userId, timestamp }
 * 
 * 4. user.password_changed
 *    Routing Key: user.password_changed
 *    Payload: { userId, timestamp }
 *    Consumers: Notification Service (security alert)
 * 
 * 5. user.email_verified
 *    Routing Key: user.email_verified
 *    Payload: { userId, email, timestamp }
 * 
 * 6. security.failed_login
 *    Routing Key: security.failed_login
 *    Payload: { email, ip, attempts, timestamp }
 *    Consumers: Security Monitoring Service
 * 
 * 7. security.account_locked
 *    Routing Key: security.account_locked
 *    Payload: { userId, email, reason, timestamp }
 *    Consumers: Notification Service, Security Service
 */
```

### 8. Service-to-Service Authentication

```javascript
/**
 * POST /api/v1/auth/s2s/token
 * Headers: { X-Service-Id, X-Service-Secret }
 * Response: { token, expiresIn }
 * Logic:
 *   1. Verify service credentials from header
 *   2. Check if service is registered in database
 *   3. Generate service JWT (1 hour expiration)
 *   4. Include serviceId in token payload
 *   5. Return token
 * 
 * POST /api/v1/auth/s2s/verify
 * Headers: { X-Service-Token }
 * Body: { userId }
 * Response: { user }
 * Logic:
 *   1. Verify service token from header
 *   2. Extract serviceId from token
 *   3. Check if service is allowed to access this endpoint
 *   4. Find and return user data (filtered based on service permissions)
 */
```

### 9. Error Handling

```javascript
/**
 * Centralized Error Handler Middleware
 * 
 * Error Types:
 * - ValidationError (400): Input validation failed
 * - UnauthorizedError (401): Authentication failed
 * - ForbiddenError (403): Authorization failed
 * - NotFoundError (404): Resource not found
 * - ConflictError (409): Duplicate resource
 * - TooManyRequestsError (429): Rate limit exceeded
 * - InternalServerError (500): Server error
 * 
 * Error Response Format:
 * {
 *   success: false,
 *   error: {
 *     code: "ERROR_CODE",
 *     message: "Human readable message",
 *     details: {},  // Optional validation details
 *     timestamp: "ISO date string"
 *   }
 * }
 * 
 * Logging:
 * - Log all errors with Winston
 * - Include request ID, user ID (if available), IP, endpoint
 * - Send critical errors to monitoring system
 */
```

### 10. Testing Requirements

```javascript
/**
 * Unit Tests (Coverage > 80%):
 * - tokenService.js: generateAccessToken, generateRefreshToken, verifyToken
 * - authService.js: register, login, logout, refreshToken
 * - password utilities: hash, compare, validate strength
 * - validators: email, phone, password
 * 
 * Integration Tests:
 * - POST /register: success, duplicate email, invalid input
 * - POST /login: success, wrong password, account locked, 2FA
 * - POST /refresh-token: success, invalid token, expired token
 * - POST /logout: success, invalid token
 * - POST /change-password: success, wrong current password
 * - Rate limiting: verify lockout after limit exceeded
 * 
 * Security Tests:
 * - SQL injection attempts
 * - XSS attempts
 * - JWT tampering
 * - Password brute force protection
 * - CORS policy enforcement
 */
```

### 11. Monitoring & Observability

```javascript
/**
 * Prometheus Metrics:
 * 
 * Counters:
 * - auth_requests_total{method, endpoint, status}
 * - auth_login_success_total{role}
 * - auth_login_failure_total{reason}
 * - auth_token_generated_total{type}
 * - auth_token_refresh_total
 * - auth_password_reset_total
 * 
 * Histograms:
 * - auth_request_duration_seconds{method, endpoint}
 * - auth_password_hash_duration_seconds
 * - auth_db_query_duration_seconds{operation}
 * 
 * Gauges:
 * - auth_active_users{role}
 * - auth_locked_accounts_total
 * - auth_redis_connected (0 or 1)
 * - auth_postgresql_connected (0 or 1)
 * 
 * Health Check:
 * GET /health
 * {
 *   status: "healthy|degraded|unhealthy",
 *   timestamp: "ISO string",
 *   services: {
 *     postgresql: { status: "up|down", latency: 10 },
 *     redis: { status: "up|down", latency: 5 },
 *     rabbitmq: { status: "up|down", latency: 8 }
 *   },
 *   version: "1.0.0",
 *   uptime: 3600
 * }
 */
```

## 📝 Development Checklist

### Phase 1: Foundation (Day 1-2)
- [ ] Initialize Node.js project với package.json
- [ ] Setup folder structure theo chuẩn
- [ ] Configure PostgreSQL connection với Prisma
- [ ] Configure Redis connection
- [ ] Configure RabbitMQ connection
- [ ] Setup environment variables (.env)
- [ ] Setup Winston logger
- [ ] Create base Express app với security middleware (helmet, cors)

### Phase 2: Core Authentication (Day 3-5)
- [ ] Create User model với validation
- [ ] Create RefreshToken model
- [ ] Implement password hashing utilities (bcrypt)
- [ ] Implement JWT utilities (sign, verify, decode)
- [ ] Create tokenService (generate, verify, blacklist)
- [ ] Implement register endpoint với validation
- [ ] Implement login endpoint với rate limiting
- [ ] Implement logout endpoint
- [ ] Implement refresh token endpoint
- [ ] Add authentication middleware
- [ ] Add authorization middleware

### Phase 3: Advanced Features (Day 6-7)
- [ ] Implement forgot password flow
- [ ] Implement reset password flow
- [ ] Implement change password endpoint
- [ ] Implement email verification
- [ ] Implement 2FA (optional)
- [ ] Add account lockout logic
- [ ] Implement password history check
- [ ] Create RabbitMQ event publisher
- [ ] Publish events for all major actions

### Phase 4: Service-to-Service (Day 8)
- [ ] Implement service token generation
- [ ] Implement service token verification
- [ ] Create service user endpoints for other microservices
- [ ] Add service authentication middleware

### Phase 5: Monitoring & Testing (Day 9-10)
- [ ] Setup Prometheus metrics
- [ ] Create health check endpoint
- [ ] Write unit tests (> 80% coverage)
- [ ] Write integration tests
- [ ] Write security tests
- [ ] Create Dockerfile
- [ ] Create docker-compose.yml
- [ ] Write API documentation

### Phase 6: Production Ready (Day 11-12)
- [ ] Add request logging
- [ ] Add error tracking
- [ ] Optimize database indexes
- [ ] Add database migration scripts
- [ ] Configure log rotation
- [ ] Security audit
- [ ] Performance testing
- [ ] Create deployment guide
- [ ] Create runbook for operations

## 🎯 Implementation Guidelines

### DO's ✅
1. **Always validate input** - Use express-validator or Joi
2. **Use async/await** - Không dùng callbacks
3. **Handle errors properly** - Try-catch cho async operations
4. **Log everything** - Actions, errors, security events
5. **Use environment variables** - Không hardcode credentials
6. **Hash passwords** - Luôn luôn dùng bcrypt, never plain text
7. **Short-lived tokens** - Access token max 15 minutes
8. **Rate limiting** - Protect all public endpoints
9. **Sanitize output** - Remove sensitive fields from responses
10. **Use transactions** - Cho critical operations
11. **Test thoroughly** - Unit + Integration + Security tests
12. **Document APIs** - Clear examples và error codes

### DON'Ts ❌
1. **Never log passwords** - Dù là hashed hay plain
2. **Never trust user input** - Always validate
3. **Never use weak hashing** - No MD5, SHA1 for passwords
4. **Never expose internal errors** - Send generic messages to users
5. **Never skip token verification** - Always verify signature
6. **Never store tokens in localStorage** - Vulnerable to XSS
7. **Never allow unlimited login attempts** - Always rate limit
8. **Never send passwords via email** - Only send reset links
9. **Never reuse secrets** - Different secrets for different purposes
10. **Never ignore security updates** - Keep dependencies updated

## 🔍 Code Quality Standards

### File Naming
- Controllers: `authController.js`, `userController.js`
- Services: `tokenService.js`, `authService.js`
- Models: `User.js`, `RefreshToken.js` (PascalCase)
- Middleware: `authentication.js`, `rateLimiter.js`
- Utils: `bcrypt.js`, `validators.js`

### Code Style
```javascript
// ✅ Good
const express = require('express');
const router = express.Router();

router.post('/login', 
  loginLimiter,
  validateLoginInput,
  asyncHandler(authController.login)
);

// ❌ Bad
const express=require('express')
router.post('/login',authController.login) // No validation, no rate limiting
```

### Error Handling Pattern
```javascript
// ✅ Good - Async handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/login', asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result });
}));

// ❌ Bad - No error handling
router.post('/login', async (req, res) => {
  const result = await authService.login(req.body); // Unhandled rejection
  res.json(result);
});
```

### Response Format
```javascript
// ✅ Good - Consistent format
{
  success: true,
  data: {
    accessToken: "...",
    refreshToken: "...",
    user: { id, email, role }
  },
  message: "Login successful"
}

// Error response
{
  success: false,
  error: {
    code: "INVALID_CREDENTIALS",
    message: "Email or password is incorrect"
  }
}

// ❌ Bad - Inconsistent
{
  token: "...",
  user: {}
}
```

## 📚 Reference Implementation Snippets

### Password Validation
```javascript
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length < minLength) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain uppercase letter' };
  }
  if (!hasLowerCase) {
    return { valid: false, message: 'Password must contain lowercase letter' };
  }
  if (!hasNumbers) {
    return { valid: false, message: 'Password must contain number' };
  }
  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain special character' };
  }
  
  return { valid: true };
};
```

### JWT Token Generation
```javascript
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      type: 'access'
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m' }
  );
};

const generateRefreshToken = (user) => {
  const tokenId = uuidv4();
  const token = jwt.sign(
    {
      userId: user.id,
      tokenId,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d' }
  );
  
  return { token, tokenId };
};
```

### Rate Limiter Setup
```javascript
const Redis = require('redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');

const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const loginLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login_limit',
  points: 5, // 5 attempts
  duration: 900, // 15 minutes
  blockDuration: 3600 // Block for 1 hour after limit
});

const loginLimiterMiddleware = async (req, res, next) => {
  try {
    await loginLimiter.consume(req.ip);
    next();
  } catch (rejRes) {
    res.status(429).json({
      success: false,
      error: {
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many login attempts. Please try again later.',
        retryAfter: rejRes.msBeforeNext / 1000
      }
    });
  }
};
```

## 🚀 Quick Start Command

```bash
# Run this prompt with Claude or another AI
"Please build the Auth Service for a Cab Booking System following the specifications in AI_AGENT_PROMPT.md. Start with Phase 1 (Foundation) and implement all required features with proper security, error handling, and testing. Use the provided code snippets as reference and ensure all DO's and DON'Ts are followed."
```

## 📞 Support & Questions

Nếu có bất kỳ câu hỏi hoặc cần clarification về requirements:
1. Check README.md trước
2. Review code snippets trong prompt này
3. Consult với team lead
4. Create GitHub issue với tag `question`

---

**Remember**: Security là #1 priority. Khi có doubt về security decision, luôn chọn approach an toàn hơn (secure by default).