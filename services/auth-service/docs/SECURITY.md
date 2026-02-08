# Security Implementation

Detailed documentation of security measures implemented in Auth Service.

## Password Security

### Hashing Algorithm

**Algorithm**: bcrypt  
**Salt Rounds**: 12

```javascript
// Implementation in src/utils/bcrypt.util.js
const SALT_ROUNDS = 12;
const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
```

**Why bcrypt?**
- Designed specifically for password hashing
- Automatically handles salt generation
- Configurable work factor (salt rounds)
- Resistant to rainbow table attacks
- Slow by design to prevent brute force

### Password Complexity Requirements

| Requirement | Rule |
|-------------|------|
| Minimum length | 8 characters |
| Uppercase | At least 1 uppercase letter |
| Lowercase | At least 1 lowercase letter |
| Numbers | At least 1 digit |
| Special characters | At least 1 of: `!@#$%^&*(),.?":{}|<>` |

### Password History

- Last 5 passwords are stored (hashed)
- Users cannot reuse any of their last 5 passwords
- Checked during password reset and change

```javascript
// Check against history
const isInHistory = await bcryptUtil.isPasswordInHistory(
  newPassword, 
  passwordHistory.map(h => h.password)
);
```

---

## JWT Token Security

### Token Types

| Token | Purpose | Expiration | Secret |
|-------|---------|------------|--------|
| Access Token | API authentication | 15 minutes | `JWT_ACCESS_SECRET` |
| Refresh Token | Obtain new access token | 7 days | `JWT_REFRESH_SECRET` |
| Service Token | Service-to-service auth | 1 hour | `JWT_ACCESS_SECRET` |

### Access Token Structure

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "CUSTOMER",
  "type": "access",
  "iat": 1705312200,
  "exp": 1705313100
}
```

### Refresh Token Structure

```json
{
  "userId": "uuid",
  "tokenId": "uuid",  // For tracking
  "type": "refresh",
  "iat": 1705312200,
  "exp": 1705917000
}
```

### Token Rotation

Refresh tokens are rotated on each use:

1. Old refresh token is revoked
2. New refresh token is generated
3. `replacedByToken` field tracks the chain

**Benefits**:
- Limits usefulness of stolen tokens
- Enables token reuse detection

### Token Reuse Detection

If a revoked refresh token is used:

1. Detected as potential attack
2. ALL user sessions are invalidated
3. Security event is logged
4. User must log in again

```javascript
if (!storedToken.isActive || storedToken.revokedAt) {
  // Token reuse attack detected!
  await prisma.refreshToken.updateMany({
    where: { userId: storedToken.userId },
    data: { isActive: false, revokedAt: new Date() }
  });
}
```

### Token Blacklisting

Access tokens can be blacklisted via Redis:

```javascript
// Key format
`blacklist:${sha256(token)}`

// TTL = remaining token expiry time
await redis.setex(key, ttlSeconds, userId);
```

---

## Rate Limiting

### Implementation

Uses `rate-limiter-flexible` with Redis backend.

### Limits

| Endpoint Type | Limit | Window | Block Duration |
|---------------|-------|--------|----------------|
| Login | 5 attempts | 15 minutes | 1 hour |
| Password Reset | 3 attempts | 1 hour | - |
| General API | 100 requests | 15 minutes | - |

### Fallback

If Redis is unavailable, falls back to in-memory rate limiting.

---

## Account Lockout

### Policy

| Setting | Value |
|---------|-------|
| Max failed attempts | 5 |
| Lockout duration | 1 hour |
| Reset on | Successful login |

### Implementation

```javascript
// After failed login
const newFailedAttempts = user.failedLoginAttempts + 1;

if (newFailedAttempts >= 5) {
  user.accountLockedUntil = new Date(Date.now() + 3600000);
  // Publish security event
}
```

### Security Events

When account is locked:
1. Event published to RabbitMQ
2. Security log created
3. (Future) Email notification sent

---

## CORS Configuration

```javascript
cors: {
  origin: ['http://localhost:3000'],  // Configurable
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-Service-Id',
    'X-Service-Secret',
    'X-Service-Token'
  ]
}
```

---

---

## Two-Factor Authentication (2FA)

### Implementation

- **Algorithm**: Time-based One-Time Password (TOTP) (RFC 6238)
- **Library**: `speakeasy`
- **Secret Storage**: Base32 encoded secret stored in database
- **Verification**: 6-digit code, 30-second window (allows 1 step clock skew)

### Backup Codes

- **Generation**: 10 random 8-character alphanumeric codes
- **Storage**: Hashed (SHA-256) in database (recommended for production)
- **Usage**: One-time use only (in theory, currently MVP implementation)
- **Regeneration**: Invalidates all previous codes

### Security Measures

1. **Secret Generation**: Cryptographically secure random components
2. **QR Code**: Generated as Data URL, never stored
3. **Enforcement**: 
   - Login flow blocked until 2FA verified if enabled
   - Temporary restricted token used during 2FA step
4. **Recovery**: Backup codes for lost device access

---

## Email Security

### Verification Flow

1. User registers -> Account specific logic (status: pending)
2. Secure random token generated (32 bytes hex)
3. Token hashed (SHA-256) and stored in DB with expiration
4. **Original** token sent via email (never stored plain)
5. Link clicked -> Token hashed and compared with DB
6. If match -> Email verified, token cleared

### Password Reset Flow

Similar to verification but with stricter controls:
1. **Rate Limiting**: 3 requests per hour
2. **Expiration**: 1 hour (short-lived)
3. **Invalidation**: 
   - On successful reset
   - On new request (old token invalidated)
4. **Notification**: Email sent on request AND on success

### Anti-Phishing

- Templates use specific branding
- Links valid only for specific actions
- "Don't click if you didn't request" warnings
- No sensitive data in email body

---

## Security Headers (Helmet)

Automatically applied headers:

| Header | Purpose |
|--------|---------|
| X-Content-Type-Options | Prevent MIME sniffing |
| X-Frame-Options | Prevent clickjacking |
| X-XSS-Protection | XSS filtering |
| Strict-Transport-Security | Force HTTPS |
| Content-Security-Policy | Control resource loading |

---

## Input Validation

### Validation Flow

1. **Route-level validation** using `express-validator`
2. **Custom validators** for complex rules
3. **Centralized error handling**

### Validated Fields

| Field | Validations |
|-------|-------------|
| email | Required, valid format, normalized |
| password | Required, complexity check |
| phoneNumber | Required, format validation |
| firstName/lastName | Required, length 2-50 |
| twoFactorCode | Optional, 6 digits |

### XSS Prevention

- Input sanitization via express-validator
- HTML entities escaped in responses
- Content-Security-Policy headers

### SQL Injection Prevention

- Prisma ORM with parameterized queries
- No raw SQL with user input
- Type-safe database operations

---

## Secure Token Generation

For password reset and email verification:

```javascript
// Generate cryptographically secure random token
const token = crypto.randomBytes(32).toString('hex');

// Store hashed version in database
const hashedToken = crypto.createHash('sha256')
  .update(token)
  .digest('hex');
```

**Properties**:
- 256 bits of entropy
- Cryptographically secure random source
- Only hash stored in database

---

## Logging & Audit

### Security Events Logged

| Event | Log Level | Data |
|-------|-----------|------|
| Failed login | WARN | email, IP, attempt count |
| Account locked | WARN | userId, email, reason |
| Token reuse detected | WARN | userId, tokenId, IP |
| Successful login | INFO | userId, IP |
| Password changed | INFO | userId |
| User registered | INFO | userId, email |

### Log Format

```javascript
{
  timestamp: "2024-01-15T10:30:00Z",
  level: "WARN",
  service: "auth-service",
  type: "security_event",
  event: "FAILED_LOGIN",
  email: "user@example.com",
  ip: "192.168.1.1",
  attempts: 3
}
```

---

## Security Best Practices Followed

### DO's ✅

1. ✅ bcrypt for password hashing (12 rounds)
2. ✅ Short-lived access tokens (15 min)
3. ✅ Refresh token rotation
4. ✅ Rate limiting on all public endpoints
5. ✅ Account lockout after failed attempts
6. ✅ Password complexity requirements
7. ✅ Password history tracking
8. ✅ Secure random token generation
9. ✅ Token blacklisting capability
10. ✅ Consistent error responses (prevent enumeration)
11. ✅ Security event logging
12. ✅ Helmet security headers
13. ✅ CORS configuration

### DON'Ts ❌

1. ❌ Never log passwords (hashed or plain)
2. ❌ Never use weak hashing (MD5, SHA1)
3. ❌ Never expose internal errors to users
4. ❌ Never skip token verification
5. ❌ Never allow unlimited login attempts
6. ❌ Never send passwords via email
7. ❌ Never reuse secrets for different purposes

---

## Environment Security

### Required Secrets

| Variable | Description | Generation |
|----------|-------------|------------|
| `JWT_ACCESS_SECRET` | Access token signing | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | Refresh token signing | `openssl rand -hex 32` |
| `DATABASE_URL` | PostgreSQL connection | - |
| `REDIS_PASSWORD` | Redis authentication | - |

### Production Recommendations

1. Use environment-specific secrets
2. Rotate secrets regularly
3. Use secret management service (Vault, AWS Secrets Manager)
4. Never commit secrets to version control
5. Use TLS for all connections
