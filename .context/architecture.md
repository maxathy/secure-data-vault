# Architecture Overview

## System Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        AC[Admin Console<br/>Angular 21 SPA]
    end

    subgraph "API Layer"
        VA[Vault API<br/>NestJS 11]
        MW[Middleware Stack]
        VA --- MW
    end

    subgraph "Security Layer"
        CC[crypto-core<br/>AES-256-GCM Envelope]
        AUC[audit-core<br/>Hash-Chained Log]
    end

    subgraph "Data Layer"
        PG[(PostgreSQL 16<br/>Encrypted at Rest)]
    end

    subgraph "GCP Services"
        KMS[Cloud KMS<br/>HSM-backed]
        CL[Cloud Logging<br/>→ BigQuery]
    end

    AC -->|HTTPS| VA
    VA --> CC
    VA --> AUC
    CC -->|KEK Unwrap| KMS
    AUC -->|HMAC Key| KMS
    VA -->|SQL| PG
    AUC -->|Append-Only| PG
    VA -->|Structured JSON| CL
```

## Middleware Stack (request order)

```
1. CorrelationMiddleware     → Assigns X-Request-ID via AsyncLocalStorage
2. ThrottlerGuard            → Rate limiting (100 req/60s global, 20/60s records)
3. LoggingInterceptor        → Structured request/response logging (PII-redacted)
4. ZodValidationInterceptor  → Validates @ZodBody, @ZodQuery, @ZodParam schemas
5. Controller Handler        → Business logic
6. AuditInterceptor          → Appends hash-chained audit entry (POST/PUT/PATCH/DELETE)
7. ZodResponseInterceptor    → Validates outbound response shape
8. HttpExceptionFilter       → RFC 7807 error formatting
```

## Data Flow: Create Encrypted Record

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Vault API
    participant Crypto as crypto-core
    participant DB as PostgreSQL
    participant Audit as audit-core

    C->>API: POST /api/v1/records {tenantId, payload}
    API->>API: Zod validate request body
    API->>API: Generate recordId (UUIDv4)
    API->>Crypto: encrypt(payload, {recordId, tenantId})
    Crypto->>Crypto: Generate random 32-byte DEK
    Crypto->>Crypto: AES-256-GCM encrypt payload<br/>AAD = "recordId:tenantId"
    Crypto->>Crypto: AES-256-GCM wrap DEK with KEK
    Crypto->>Crypto: Zero DEK from memory
    Crypto-->>API: EncryptedEnvelope {ciphertext, wrappedDek, iv, authTag, keyId}
    API->>DB: INSERT record (id, tenantId, encryptedPayload, version=1)
    DB-->>API: OK
    API->>Audit: append({action: RECORD_CREATE, resourceId: recordId})
    Audit->>Audit: Compute prevHash from latest entry
    Audit->>DB: INSERT audit_log entry
    Audit->>Audit: Compute entryHash + HMAC signature
    Audit->>DB: UPDATE entry with hash + signature
    API-->>C: 201 {id, tenantId, version, createdAt}
```

## Package Dependency Graph

```
packages/shared-types     (zero internal deps, zero runtime deps)
packages/crypto-core      (zero internal deps, zero runtime deps)
packages/audit-core       (zero internal deps, zero runtime deps)
     │           │              │
     └───────────┼──────────────┘
                 ▼
         apps/vault-api    (depends on all three packages)

         apps/admin-console (depends on shared-types only)
```

All three packages use only Node.js built-in modules (`crypto`). This is intentional — they can be extracted and reused in any Node.js project without NestJS.

## Database Schema

| Table       | Key Columns                                       | Notes                     |
| ----------- | ------------------------------------------------- | ------------------------- |
| `tenants`   | id, name, created_at                              | Logical data isolation    |
| `users`     | id, tenant_id (FK), email, role, created_at       | Per-tenant users          |
| `records`   | id, tenant_id (FK), encrypted_payload, version    | Envelope-encrypted JSONB  |
| `audit_log` | sequence (bigserial), prev_hash, entry_hash, hmac | Append-only, hash-chained |
