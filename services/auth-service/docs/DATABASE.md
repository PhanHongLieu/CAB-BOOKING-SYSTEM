# Database Schema

Documentation of the PostgreSQL database schema managed by Prisma ORM.

## Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                              User                                 │
├──────────────────────────────────────────────────────────────────┤
│ id                    UUID          PK                           │
│ email                 VARCHAR(255)  UNIQUE                       │
│ password              VARCHAR(255)                               │
│ role                  ENUM          (CUSTOMER, DRIVER, ADMIN,    │
│                                      SERVICE)                    │
│ first_name            VARCHAR(50)                                │
│ last_name             VARCHAR(50)                                │
│ phone_number          VARCHAR(20)   UNIQUE                       │
│ is_email_verified     BOOLEAN       DEFAULT FALSE                │
│ is_phone_verified     BOOLEAN       DEFAULT FALSE                │
│ is_active             BOOLEAN       DEFAULT TRUE                 │
│ two_factor_enabled    BOOLEAN       DEFAULT FALSE                │
│ two_factor_secret     VARCHAR(255)  NULLABLE                     │
│ email_verification_*  VARCHAR/DATE  NULLABLE                     │
│ last_login            TIMESTAMP     NULLABLE                     │
│ last_login_ip         VARCHAR(45)   NULLABLE                     │
│ failed_login_attempts INTEGER       DEFAULT 0                    │
│ account_locked_until  TIMESTAMP     NULLABLE                     │
│ password_changed_at   TIMESTAMP     NULLABLE                     │
│ password_reset_*      VARCHAR/DATE  NULLABLE                     │
│ service_id            VARCHAR(255)  UNIQUE, NULLABLE             │
│ allowed_services      TEXT[]        NULLABLE                     │
│ created_at            TIMESTAMP     DEFAULT NOW                  │
│ updated_at            TIMESTAMP     AUTO UPDATE                  │
├──────────────────────────────────────────────────────────────────┤
│ INDEXES: email, phone_number, is_active, role                    │
└──────────────────────────────────────────────────────────────────┘
          │                              │
          │ 1:N                          │ 1:N
          ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────────────┐
│   PasswordHistory       │    │        RefreshToken             │
├─────────────────────────┤    ├─────────────────────────────────┤
│ id          UUID    PK  │    │ id              UUID       PK   │
│ user_id     UUID    FK  │    │ token           VARCHAR    UQ   │
│ password    VARCHAR     │    │ user_id         UUID       FK   │
│ changed_at  TIMESTAMP   │    │ expires_at      TIMESTAMP       │
├─────────────────────────┤    │ created_by_ip   VARCHAR(45)     │
│ INDEX: user_id          │    │ revoked_at      TIMESTAMP  NULL │
└─────────────────────────┘    │ revoked_by_ip   VARCHAR(45)     │
                               │ replaced_by_token VARCHAR  NULL │
                               │ is_active       BOOLEAN         │
                               │ last_used_at    TIMESTAMP  NULL │
                               │ usage_count     INTEGER         │
                               │ created_at      TIMESTAMP       │
                               │ updated_at      TIMESTAMP       │
                               ├─────────────────────────────────┤
                               │ INDEXES: token, user_id,        │
                               │          expires_at, is_active  │
                               └─────────────────────────────────┘
```

---

## Models

### User

The main user entity storing authentication and profile data.

**Table Name**: `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT uuid() | Unique identifier |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User's email address |
| password | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| role | ENUM | NOT NULL, DEFAULT 'CUSTOMER' | User role |
| first_name | VARCHAR(50) | NOT NULL | First name |
| last_name | VARCHAR(50) | NOT NULL | Last name |
| phone_number | VARCHAR(20) | UNIQUE, NOT NULL | Phone number |
| is_email_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| is_phone_verified | BOOLEAN | DEFAULT FALSE | Phone verification status |
| is_active | BOOLEAN | DEFAULT TRUE | Account active status |
| two_factor_enabled | BOOLEAN | DEFAULT FALSE | 2FA enabled |
| two_factor_secret | VARCHAR(255) | NULLABLE | 2FA TOTP secret |
| email_verification_token | VARCHAR(255) | NULLABLE | Hashed email verification token |
| email_verification_expires | TIMESTAMP | NULLABLE | Token expiry |
| last_login | TIMESTAMP | NULLABLE | Last successful login |
| last_login_ip | VARCHAR(45) | NULLABLE | IP of last login |
| failed_login_attempts | INTEGER | DEFAULT 0 | Failed login counter |
| account_locked_until | TIMESTAMP | NULLABLE | Account lock expiry |
| password_changed_at | TIMESTAMP | NULLABLE | Last password change |
| password_reset_token | VARCHAR(255) | NULLABLE | Hashed reset token |
| password_reset_expires | TIMESTAMP | NULLABLE | Token expiry |
| service_id | VARCHAR(255) | UNIQUE, NULLABLE | For service accounts |
| allowed_services | TEXT[] | NULLABLE | Services this account can access |
| created_at | TIMESTAMP | DEFAULT NOW | Creation timestamp |
| updated_at | TIMESTAMP | AUTO UPDATE | Last update timestamp |

**Indexes**:
- `email` - For login lookups
- `phone_number` - For phone-based lookups
- `is_active` - For filtering active users
- `role` - For role-based queries

### Role Enum

```prisma
enum Role {
  CUSTOMER  // Regular customers booking rides
  DRIVER    // Drivers providing rides
  ADMIN     // System administrators
  SERVICE   // Service-to-service accounts
}
```

### PasswordHistory

Stores previous password hashes to prevent reuse.

**Table Name**: `password_history`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| user_id | UUID | FK → User | Reference to user |
| password | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| changed_at | TIMESTAMP | DEFAULT NOW | When password was set |

**Cascade**: Deletes when user is deleted

### RefreshToken

Tracks issued refresh tokens for rotation and revocation.

**Table Name**: `refresh_tokens`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| token | VARCHAR(255) | UNIQUE | SHA256 hash of JWT |
| user_id | UUID | FK → User | Reference to user |
| expires_at | TIMESTAMP | NOT NULL | Token expiration |
| created_by_ip | VARCHAR(45) | NULLABLE | IP that created token |
| revoked_at | TIMESTAMP | NULLABLE | When token was revoked |
| revoked_by_ip | VARCHAR(45) | NULLABLE | IP that revoked token |
| replaced_by_token | VARCHAR(255) | NULLABLE | New token in rotation |
| is_active | BOOLEAN | DEFAULT TRUE | Token validity status |
| last_used_at | TIMESTAMP | NULLABLE | Last usage time |
| usage_count | INTEGER | DEFAULT 0 | Times token was used |
| created_at | TIMESTAMP | DEFAULT NOW | Creation timestamp |
| updated_at | TIMESTAMP | AUTO UPDATE | Last update timestamp |

**Cascade**: Deletes when user is deleted

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                   String            @id @default(uuid())
  email                String            @unique
  password             String
  role                 Role              @default(CUSTOMER)
  firstName            String            @map("first_name")
  lastName             String            @map("last_name")
  phoneNumber          String            @unique @map("phone_number")
  isEmailVerified      Boolean           @default(false) @map("is_email_verified")
  isPhoneVerified      Boolean           @default(false) @map("is_phone_verified")
  isActive             Boolean           @default(true) @map("is_active")
  twoFactorEnabled     Boolean           @default(false) @map("two_factor_enabled")
  twoFactorSecret      String?           @map("two_factor_secret")
  emailVerificationToken    String?      @map("email_verification_token")
  emailVerificationExpires  DateTime?    @map("email_verification_expires")
  lastLogin            DateTime?         @map("last_login")
  lastLoginIP          String?           @map("last_login_ip")
  failedLoginAttempts  Int               @default(0) @map("failed_login_attempts")
  accountLockedUntil   DateTime?         @map("account_locked_until")
  passwordChangedAt    DateTime?         @map("password_changed_at")
  passwordResetToken   String?           @map("password_reset_token")
  passwordResetExpires DateTime?         @map("password_reset_expires")
  passwordHistory      PasswordHistory[]
  serviceId            String?           @unique @map("service_id")
  allowedServices      String[]          @map("allowed_services")
  refreshTokens        RefreshToken[]
  createdAt            DateTime          @default(now()) @map("created_at")
  updatedAt            DateTime          @updatedAt @map("updated_at")

  @@index([email])
  @@index([phoneNumber])
  @@index([isActive])
  @@index([role])
  @@map("users")
}

enum Role {
  CUSTOMER
  DRIVER
  ADMIN
  SERVICE
}

model PasswordHistory {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  password  String
  changedAt DateTime @default(now()) @map("changed_at")

  @@index([userId])
  @@map("password_history")
}

model RefreshToken {
  id              String    @id @default(uuid())
  token           String    @unique
  userId          String    @map("user_id")
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt       DateTime  @map("expires_at")
  createdByIp     String?   @map("created_by_ip")
  revokedAt       DateTime? @map("revoked_at")
  revokedByIp     String?   @map("revoked_by_ip")
  replacedByToken String?   @map("replaced_by_token")
  isActive        Boolean   @default(true) @map("is_active")
  lastUsedAt      DateTime? @map("last_used_at")
  usageCount      Int       @default(0) @map("usage_count")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  @@index([token])
  @@index([userId])
  @@index([expiresAt])
  @@index([isActive])
  @@map("refresh_tokens")
}
```

---

## Database Commands

### Generate Prisma Client

```bash
npx prisma generate
```

### Create Migration

```bash
npx prisma migrate dev --name <migration_name>
```

### Apply Migrations (Production)

```bash
npx prisma migrate deploy
```

### Seed Database

```bash
npm run prisma:seed
```

### Open Prisma Studio

```bash
npx prisma studio
```

---

## Seed Data

The seed script creates test accounts:

| Email | Password | Role |
|-------|----------|------|
| admin@cabsystem.com | Admin123! | ADMIN |
| customer@test.com | Customer123! | CUSTOMER |
| driver@test.com | Driver123! | DRIVER |
| booking-service@internal.cabsystem.com | ServiceSecret123! | SERVICE |

---

## Redis Data Structures

In addition to PostgreSQL, Redis is used for:

### Token Blacklist

**Key Pattern**: `blacklist:{token_hash}`  
**Value**: user_id  
**TTL**: Remaining token expiry time

### Rate Limiting

**Key Pattern**: `rl:{endpoint}:{ip}`  
**Value**: Request count  
**TTL**: Rate limit window

### Session Cache (Optional)

**Key Pattern**: `session:{user_id}`  
**Value**: JSON user data  
**TTL**: 15 minutes
