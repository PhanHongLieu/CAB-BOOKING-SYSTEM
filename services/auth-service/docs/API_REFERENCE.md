# API Reference

Complete API documentation for Auth Service.

**Base URL**: `/api/v1/auth`

## Authentication

Most protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### POST /register

Register a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "role": "CUSTOMER"
}
```

**Validation Rules**:
- `email`: Required, valid email format
- `password`: Required, min 8 chars, must contain uppercase, lowercase, number, special char
- `firstName`: Required, 2-50 characters
- `lastName`: Required, 2-50 characters
- `phoneNumber`: Required, valid phone format
- `role`: Optional, one of `CUSTOMER`, `DRIVER` (default: `CUSTOMER`)

**Response** (201 Created):
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "userId": "uuid-here"
  }
}
```

**Error Responses**:
- `400` - Validation error
- `409` - Email or phone already exists

---

### POST /login

Authenticate a user and receive tokens.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "twoFactorCode": "123456"  // Optional, if 2FA enabled
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "role": "CUSTOMER",
      "isEmailVerified": true,
      "isPhoneVerified": false,
      "twoFactorEnabled": false
    }
  }
}
```

**Error Responses**:
- `401` - Invalid credentials
- `423` - Account locked (includes `unlockTime`)
- `429` - Too many login attempts

**Rate Limiting**: 5 attempts per 15 minutes per IP

---

### POST /refresh-token

Get new access token using refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-access-token...",
    "refreshToken": "new-refresh-token..."  // Rotated
  }
}
```

**Error Responses**:
- `401` - Invalid or expired refresh token

**Note**: Refresh tokens are rotated on each use. The old token becomes invalid.

---

### POST /logout

🔒 **Requires Authentication**

Logout user and invalidate tokens.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body** (optional):
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Logout successful"
}
```

**Actions**:
1. Access token added to Redis blacklist
2. Refresh token revoked in database (if provided)

---

### GET /me

🔒 **Requires Authentication**

Get current user's profile.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phoneNumber": "+1234567890",
      "role": "CUSTOMER",
      "isEmailVerified": true,
      "isActive": true,
      "twoFactorEnabled": false,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

### POST /forgot-password

Request a password reset email.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Note**: Always returns success to prevent email enumeration.

**Rate Limiting**: 3 attempts per hour per IP

---

### POST /reset-password

Reset password using token from email.

**Request Body**:
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewPassword123!"
}
```

**Validation**:
- Token must be valid and not expired (1 hour)
- New password must meet complexity requirements
- Cannot reuse last 5 passwords

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please login with your new password."
}
```

**Actions**:
1. Password updated
2. All refresh tokens revoked
3. Password added to history

---

### POST /change-password

🔒 **Requires Authentication**

Change password for authenticated user.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Request Body**:
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Validation**:
- Current password must be correct
- New password must differ from current
- New password must meet complexity requirements
- Cannot reuse last 5 passwords

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Password changed successfully."
}
```

---

### GET /verify-email

Verify email address with token.

**Query Parameters**:
- `token`: Email verification token

**Example**:
```
GET /api/v1/auth/verify-email?token=abc123...
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Email verified successfully.",
  "data": {
    "userId": "uuid"
  }
}
```

---

### POST /resend-verification

🔒 **Requires Authentication**

Resend email verification.

**Headers**:
```
Authorization: Bearer <access_token>
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Verification email has been sent."
}
```

---

## Health Endpoints

### GET /health

Full health check with all dependencies.

**Response** (200 OK / 503 Service Unavailable):
```json
{
  "status": "healthy",
  "service": "auth-service",
  "timestamp": "2024-01-15T10:30:00Z",
  "uptime": 3600,
  "version": "1.0.0",
  "responseTime": 15,
  "services": {
    "postgresql": { "status": "up", "latency": 5 },
    "redis": { "status": "up", "latency": 2 },
    "rabbitmq": { "status": "up", "latency": 8 }
  }
}
```

### GET /live

Kubernetes liveness probe.

**Response** (200 OK):
```json
{ "status": "ok" }
```

### GET /ready

Kubernetes readiness probe.

**Response** (200 OK / 503):
```json
{ "status": "ready" }
```

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `INVALID_TOKEN` | 401 | JWT invalid or expired |
| `TOKEN_REVOKED` | 401 | Token has been revoked |
| `TOKEN_EXPIRED` | 401 | Token has expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `DUPLICATE_EMAIL` | 409 | Email already registered |
| `DUPLICATE_PHONE` | 409 | Phone already registered |
| `ACCOUNT_LOCKED` | 423 | Account is locked |
| `TOO_MANY_REQUESTS` | 429 | Rate limit exceeded |
| `PASSWORD_HISTORY` | 400 | Password was recently used |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /login | 5 requests | 15 minutes |
| POST /forgot-password | 3 requests | 1 hour |
| All API endpoints | 100 requests | 15 minutes |

When rate limit is exceeded, response includes:
```json
{
  "success": false,
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Too many login attempts. Please try again later.",
    "retryAfter": 300
  }
}
```

Header is also set:
```
Retry-After: 300
```
