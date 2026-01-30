# AuthService – AI-Agent Executable Specification

> **Purpose**: Tài liệu này được thiết kế để **AI Agent có thể đọc – hiểu – suy luận – và thực thi** (generate code, test, infra, policy) cho AuthService trong hệ thống CAB Booking.
>
> Chuẩn: **Deterministic, Unambiguous, Actionable, Machine-readable**

---

## 0. Service Metadata

```yaml
service:
  name: auth-service
  domain: identity-access-management
  architecture: microservice
  language: NodeJS / NestJS
  runtime: containerized
  trust_model: zero-trust
```

---

## 1. Service Responsibility Contract

```yaml
responsibilities:
  - authenticate_user
  - issue_access_token
  - rotate_refresh_token
  - authorize_request
  - manage_machine_identity
  - revoke_credentials
```

**Out of scope**:

* User profile management
* Business authorization logic

---

## 2. External Dependencies

```yaml
dependencies:
  user_service:
    type: internal_http
    required: true
  redis:
    type: cache
    required: true
  postgres:
    type: database
    required: true
  api_gateway:
    type: edge
    required: true
```

---

## 3. Data Models (Canonical)

### 3.1 UserCredential

```yaml
UserCredential:
  id: uuid
  user_id: uuid
  password_hash: string
  status: [ACTIVE, SUSPENDED]
```

### 3.2 RefreshToken

```yaml
RefreshToken:
  token_id: uuid
  user_id: uuid
  token_hash: string
  expires_at: timestamp
  revoked: boolean
```

---

## 4. Token Specification

### 4.1 Access Token (JWT)

```yaml
access_token:
  type: JWT
  ttl_minutes: 15
  claims:
    sub: user_id
    role: [CUSTOMER, DRIVER, ADMIN]
    scopes: list[string]
    iat: epoch
    exp: epoch
```

### 4.2 Refresh Token

```yaml
refresh_token:
  ttl_days: 14
  rotation: mandatory
  storage: hashed
```

---

## 5. API Interface (Executable)

### 5.1 POST /auth/login

```yaml
endpoint: /auth/login
method: POST
input:
  username: string
  password: string
output:
  access_token: string
  refresh_token: string
errors:
  - INVALID_CREDENTIAL
  - USER_SUSPENDED
```

### 5.2 POST /auth/refresh

```yaml
endpoint: /auth/refresh
method: POST
input:
  refresh_token: string
output:
  access_token: string
  refresh_token: string
errors:
  - TOKEN_EXPIRED
  - TOKEN_REUSED
```

### 5.3 POST /auth/logout

```yaml
endpoint: /auth/logout
method: POST
input:
  refresh_token: string
side_effects:
  - revoke_refresh_token
```

---

## 6. Deterministic Authentication Flows

### 6.1 Login Flow

```text
IF credential_valid AND user_status == ACTIVE
  THEN issue access_token + refresh_token
ELSE
  deny_access
```

### 6.2 Refresh Flow

```text
IF refresh_token.valid AND NOT reused
  THEN rotate_token
ELSE
  revoke_all_tokens(user_id)
```

---

## 7. Authorization Rules (RBAC + Scope)

```yaml
authorization:
  CUSTOMER:
    - booking:create
    - ride:view
  DRIVER:
    - ride:update
    - location:write
  ADMIN:
    - system:manage
```

---

## 8. Zero Trust Enforcement Points

```yaml
zero_trust:
  client:
    - tls_1_3
    - rate_limit
  gateway:
    - jwt_verify
    - scope_check
  service:
    - mTLS
    - identity_propagation
```

---

## 9. Service-to-Service Authentication

```yaml
machine_identity:
  mechanism: mTLS
  issued_by: internal_ca
  validation: service_mesh
```

---

## 10. Observability Contract

### 10.1 Metrics

```yaml
metrics:
  - auth_login_success_total
  - auth_login_failure_total
  - token_refresh_total
  - auth_latency_ms
```

### 10.2 Logs

```yaml
logs:
  level: INFO | WARN | ERROR
  events:
    - LOGIN_ATTEMPT
    - TOKEN_ROTATED
    - TOKEN_REVOKED
```

---

## 11. Failure Handling Rules

```yaml
failures:
  redis_down:
    action: deny_login
  user_service_timeout:
    action: retry_then_fail
```

---

## 12. Security Invariants (Non-negotiable)

```yaml
invariants:
  - plaintext_password_prohibited
  - refresh_token_single_use
  - access_token_short_lived
  - no_trust_internal_network
```

---

## 13. AI-Agent Actionability Guide

> AI Agent có thể:

* Generate NestJS module từ API spec
* Generate DB migration từ data models
* Generate Istio policy từ Zero Trust rules
* Generate unit & integration tests từ flows
* Validate runtime behavior với invariants

---

## 14. Versioning

```yaml
version: 1.0.0
compatibility:
  backward: true
```

---

## 15. End of Specification

**This document is authoritative and executable by AI agents.**
