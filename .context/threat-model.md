# Threat Model

## Assets

| Asset                     | Classification | Location                                        |
| ------------------------- | -------------- | ----------------------------------------------- |
| PHI/PII payloads          | Critical       | `records.encrypted_payload` (encrypted at rest) |
| DEK (data encryption key) | Critical       | Memory only (zeroed after use)                  |
| KEK (key encryption key)  | Critical       | Keyset file (dev) / Cloud KMS (prod)            |
| MAC signing key           | High           | Keyset file (dev) / Cloud KMS (prod)            |
| Audit chain               | High           | `audit_log` table (append-only)                 |
| Tenant/user metadata      | Medium         | `tenants`, `users` tables                       |
| API access tokens         | High           | Client-side (not stored server-side)            |

## Threat Table

| ID   | Threat                               | STRIDE | Mitigation                                                                  | Status |
| ---- | ------------------------------------ | ------ | --------------------------------------------------------------------------- | ------ |
| T-01 | Database breach exposes plaintext    | **I**  | AES-256-GCM envelope encryption; payloads never stored in clear             | Done   |
| T-02 | Ciphertext transplant across tenants | **T**  | AAD binds `recordId:tenantId`; decrypt fails on mismatch                    | Done   |
| T-03 | Audit log tampering                  | **T**  | SHA-256 hash chain + HMAC-SHA-256 signatures; verified on demand            | Done   |
| T-04 | Audit log row deletion               | **T**  | Sequence gap detection in `verifyChain()`                                   | Done   |
| T-05 | Audit log row insertion              | **T**  | prevHash linkage breaks; entryHash mismatch detected                        | Done   |
| T-06 | Key material in logs                 | **I**  | `safeLog()` redacts keys matching PII/secret patterns                       | Done   |
| T-07 | Decrypted payload in logs            | **I**  | Strict rule: decrypt returns to controller only, never logged               | Done   |
| T-08 | DEK remains in memory                | **I**  | `dek.fill(0)` in finally block after encryption                             | Done   |
| T-09 | Timing attack on HMAC verification   | **I**  | `crypto.timingSafeEqual()` for all signature comparisons                    | Done   |
| T-10 | Lost-update on concurrent writes     | **T**  | Optimistic concurrency: `version` column, 409 on mismatch                   | Done   |
| T-11 | Rate-limit bypass / DDoS             | **D**  | `@nestjs/throttler` global (100/60s) + per-endpoint (20/60s)                | Done   |
| T-12 | Malformed input injection            | **T**  | Zod validation on all request bodies, queries, and params                   | Done   |
| T-13 | Error message information leakage    | **I**  | RFC 7807 filter strips internal details; generic 500 for unknowns           | Done   |
| T-14 | Dev keyset used in production        | **E**  | WARN log on startup; prod must use KMS-backed keyset                        | Done   |
| T-15 | Correlation ID spoofing              | **S**  | X-Request-ID accepted if present, generated if absent; not trusted for auth | Done   |

**STRIDE categories:** **S**poofing, **T**ampering, **I**nformation Disclosure, **D**enial of Service, **E**levation of Privilege

## Trust Boundaries

```
┌─────────────────────────────────────────────────────┐
│  UNTRUSTED: Internet / Client                       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  BOUNDARY: TLS termination + Rate limiting          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  TRUSTED: Vault API (Zod validation at entry)       │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  TRUSTED: crypto-core / audit-core (pure functions) │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  TRUSTED: PostgreSQL (encrypted at rest, private IP)│
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│  TRUSTED: Cloud KMS (HSM-backed, IAM-controlled)    │
└─────────────────────────────────────────────────────┘
```

## Out of Scope

- Authentication/authorization (intended to be added per-deployment with OIDC provider)
- Network-layer security (handled by GCP VPC, Cloud Armor)
- Client-side security (admin console is an internal tool)
- Backup encryption (handled by Cloud SQL managed backups with CMEK)
