# secure-data-vault — Product Requirements Document

> A reference NestJS 11 architecture for storing regulated data with application-layer AES-256-GCM envelope encryption via Google Tink, tamper-evident audit trails, and type-safe validation pipes.

---

## 1. Executive Summary

`secure-data-vault` is a reference architecture for teams that store regulated data — PHI, PII, financial records, or any other compliance-sensitive domain — on Google Cloud Platform. It implements a NestJS 11 API backed by Postgres 16, where every record is encrypted at the application layer using Google Tink's AES-256-GCM envelope encryption primitive, master keys are managed by Cloud KMS, every mutating operation appends a hash-chained and HMAC-signed audit log entry, and every API boundary is guarded by Zod validation schemas shared from a standalone typed package. The repository is a sanitized extraction of production compliance patterns, narrow and deep enough to serve as verifiable architectural proof to any security-literate reviewer evaluating a vendor's ability to handle regulated data.

---

## 2. Threat Model

### Threats Addressed

| Threat | Mitigation |
|--------|-----------|
| **Database exfiltration** | Application-layer envelope encryption via Google Tink AES-256-GCM. A stolen Postgres dump contains only ciphertext; decryption requires Cloud KMS access, which is gated by IAM. |
| **Malicious insider with DB access** | The encrypted_payload column stores ciphertext and the wrapped DEK. The plaintext DEK and master key material never touch disk and never leave application memory; an insider with raw DB access cannot decrypt records without also holding a Cloud KMS IAM binding. |
| **Audit log tampering** | The audit_log table is append-only (no UPDATE/DELETE grants on the service account). Each row stores `prev_hash` (SHA-256 of the prior row's full record) and `entry_hash` (SHA-256 of the current row's fields), plus an HMAC signature from a dedicated Tink MacKeysetHandle wrapped by Cloud KMS. The `/audit/verify` endpoint walks the chain and detects any insertion, deletion, or field mutation. |
| **Input-based attacks** (injection, mass assignment, type confusion) | Zod schemas in `packages/shared-types` are enforced by a global `ZodValidationPipe` on every NestJS controller. Schemas are also applied to response bodies in an interceptor. Inputs never reach service logic without passing the schema. |
| **Replay attacks on the audit log** | Each audit row carries a monotonically increasing `sequence` (BIGINT, generated always as identity) and a signed timestamp included in the HMAC payload. Gaps in sequence or a signature over a stale timestamp are detected by `/audit/verify`. |

### Threats Explicitly Out of Scope

| Threat | Rationale |
|--------|-----------|
| **Network-layer attacks** (MITM, TLS stripping) | TLS termination is assumed upstream (load balancer / Cloud Run ingress). This repo does not manage certificates or network policy. |
| **Client-side compromise** | Browser or mobile client security is outside the server-side reference architecture boundary. |
| **Side-channel attacks on Cloud KMS itself** | Google's KMS HSM infrastructure is assumed to be the trust root. Attacks against KMS hardware or Google's internal key management are out of scope. |

---

## 3. Repository Structure

Yarn workspaces monorepo. Node 20 LTS. TypeScript 5.4 strict mode throughout.

```
secure-data-vault/
├── apps/
│   ├── vault-api/                  # NestJS 11 core service
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── records/            # records CRUD module
│   │   │   ├── audit/              # audit module + /audit/verify
│   │   │   ├── tenants/
│   │   │   ├── users/
│   │   │   ├── common/
│   │   │   │   ├── interceptors/   # AuditInterceptor, LoggingInterceptor
│   │   │   │   ├── filters/        # HttpExceptionFilter → RFC 7807
│   │   │   │   ├── pipes/          # ZodValidationPipe
│   │   │   │   ├── decorators/     # @ZodBody, @ZodQuery, @ZodParam
│   │   │   │   └── safe-log/       # PII-redacting log utility
│   │   │   └── db/                 # Drizzle schema + migrations
│   │   ├── test/                   # E2E tests (Jest + Supertest)
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── admin-console/              # Angular 21 SPA
│       ├── src/
│       │   ├── app/
│       │   │   ├── records/        # list, create, view record pages
│       │   │   ├── audit/          # audit chain inspection page
│       │   │   └── shared/         # Spartan UI + Tailwind v4 wrappers
│       │   └── environments/
│       ├── angular.json
│       └── package.json
│
├── packages/
│   ├── shared-types/               # Zod schemas + inferred TS types
│   │   ├── src/
│   │   │   ├── record.schema.ts
│   │   │   ├── audit.schema.ts
│   │   │   ├── tenant.schema.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── crypto-core/                # Google Tink envelope encryption
│   │   ├── src/
│   │   │   ├── encrypt.ts
│   │   │   ├── decrypt.ts
│   │   │   ├── keyset-loader.ts    # dev vs prod keyset loading
│   │   │   ├── types.ts            # EncryptedEnvelope, CryptoContext
│   │   │   └── index.ts
│   │   ├── keysets/
│   │   │   └── INSECURE-DEV-ONLY.keyset.json
│   │   ├── test/
│   │   └── package.json
│   │
│   └── audit-core/                 # Hash-chained audit log
│       ├── src/
│       │   ├── audit-log.ts        # append, verify
│       │   ├── chain.ts            # hash-chain computation
│       │   ├── hmac.ts             # Tink MacKeysetHandle signing
│       │   ├── storage/
│       │   │   ├── in-memory.ts    # for unit tests
│       │   │   └── drizzle.ts      # production Drizzle adapter
│       │   └── index.ts
│       ├── test/
│       └── package.json
│
├── infra/                          # Terraform stubs
│   ├── kms.tf                      # Cloud KMS key ring + crypto keys
│   ├── sql.tf                      # Cloud SQL for Postgres
│   ├── logging.tf                  # Cloud Logging sinks
│   ├── iam.tf                      # Service accounts, least-privilege bindings
│   └── variables.tf
│
├── .context/                       # Persistent architectural context for agents
│   ├── architecture.md
│   ├── threat-model.md
│   └── decisions.md                # ADRs
│
├── .agents/                        # Specialized subagent definitions
│   ├── security-reviewer.md
│   ├── migration-author.md
│   └── test-author.md
│
├── mcp-config/
│   └── mcp.json                    # MCP server configuration
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── security.yml
│       ├── e2e.yml
│       └── release.yml
│
├── docker-compose.yml              # Postgres 16 + dev Tink keyset volume
├── CLAUDE.md                       # Claude Code context + project conventions
├── AGENTS.md                       # Agent registry and routing rules
├── package.json                    # Yarn workspaces root
└── PRD.md                          # This document
```

**Architectural decision:** Yarn workspaces (not npm workspaces or pnpm) because the `packages/` libraries use `workspace:*` protocol for cross-package references, and Yarn's hoisting behavior is well-understood for monorepo CI caching.

---

## 4. AES-256-GCM Envelope Encryption Specification

### Library

Google Tink (TypeScript: `@google-cloud/tink-typescript` or the `tink-crypto` WASM port). Tink is the canonical GCP primitive for envelope encryption. The `crypto-core` package wraps Tink's `KeysetHandle` and `Aead` APIs so the identical code path runs against a local keyset in dev and a Cloud KMS-wrapped keyset in prod.

### Master Key

**Production:** A Cloud KMS `CryptoKey` in a dedicated key ring (`vault-keyring`). The key ring holds two crypto keys: `vault-dek-master` (for data encryption) and `vault-audit-mac` (for audit HMAC — see Section 5). Tink's `GcpKmsClient` is registered at application startup; `KeysetHandle.read()` fetches the wrapped keyset from Cloud KMS, unwraps it in the KMS HSM, and returns the in-memory `KeysetHandle`. Plaintext key material never touches disk and never leaves process memory.

**Development:** A committed Tink keyset JSON file at `packages/crypto-core/keysets/INSECURE-DEV-ONLY.keyset.json`, mounted read-only into the `vault-api` container via `docker-compose.yml`. This file is:
- Clearly labeled `INSECURE-DEV-ONLY` in its filename.
- Accompanied by a prominent banner in README and docker-compose comments.
- Triggers a runtime `WARN` log on first use: `[crypto-core] INSECURE-DEV-ONLY keyset loaded — never use in production`.
- Requires zero GCP account or credentials to use.

### Data Keys (DEKs)

Per-record Data Encryption Keys are generated by Tink's `Aead` primitive inside the wrapped keyset for each `encrypt()` call. Tink manages DEK generation internally as part of the envelope pattern: the DEK encrypts the plaintext; the master key wraps (encrypts) the DEK. The wrapped DEK is stored alongside the ciphertext. Plaintext DEKs are never persisted.

### Encryption Algorithm

`AesGcmKeyTemplate` with 256-bit keys. Tink generates a unique 96-bit IV per `encrypt()` call internally. The output is opaque Tink ciphertext that embeds the key ID and IV in its header.

### Associated Authenticated Data (AAD)

Every `encrypt()` and `decrypt()` call binds `record_id + tenant_id` as AAD:

```ts
const aad = Buffer.from(`${context.recordId}:${context.tenantId}`, 'utf8');
```

Decryption with mismatched AAD throws a Tink `SecurityException`. This prevents ciphertext from being transplanted between records or tenants even if an attacker gains write access to the `records` table.

### Storage Layout

The `encrypted_payload` column (JSONB) stores:

```jsonc
{
  "ciphertext": "<base64-encoded Tink ciphertext>",
  "encryptedDataKey": "<base64-encoded wrapped DEK>",
  "keyVersion": "1",          // Cloud KMS CryptoKeyVersion number
  "tinkKeyId": 1234567890,    // Tink key ID within the keyset
  "algTemplate": "AES256_GCM"
}
```

### Key Rotation

Tink keysets are versioned. When a new primary key is added to the keyset (via Cloud KMS key rotation or manual `KeysetHandle` update), new records are encrypted under the new primary key. Old records remain readable because Tink's `decrypt()` selects the correct key by matching `tinkKeyId` in the ciphertext header against the full keyset. No re-encryption of existing records is required for a rotation.

### Public API (crypto-core package)

```ts
export interface CryptoContext {
  recordId: string;
  tenantId: string;
}

export interface EncryptedEnvelope {
  ciphertext: string;        // base64
  encryptedDataKey: string;  // base64
  keyVersion: string;
  tinkKeyId: number;
  algTemplate: string;
}

export function encrypt(plaintext: string, context: CryptoContext): Promise<EncryptedEnvelope>;
export function decrypt(envelope: EncryptedEnvelope, context: CryptoContext): Promise<string>;
```

These are the ONLY exports. No key management, no keyset rotation, no raw Tink primitives exposed from this package.

### Dev vs Prod Keyset Loading

`keyset-loader.ts` reads `CRYPTO_CORE_MODE` from the environment:

- `dev` (default if unset): loads `INSECURE-DEV-ONLY.keyset.json` from the package's `keysets/` directory, emits the warning log.
- `prod`: reads `KMS_KEY_URI` and uses `GcpKmsClient` to fetch and unwrap the keyset from Cloud KMS. Requires Application Default Credentials (workload identity or service account key).

---

## 5. Audit Interceptor Specification

### NestJS Global Interceptor

`AuditInterceptor` is registered as a global interceptor in `AppModule`. It fires on every request whose HTTP method is `POST`, `PUT`, `PATCH`, or `DELETE`.

### Captured Fields

| Field | Source |
|-------|--------|
| `actor_id` | Extracted from the authenticated JWT (`req.user.sub`) |
| `action` | Derived from HTTP method + route metadata (e.g., `records:create`) |
| `resource_type` | Route metadata (e.g., `record`, `user`) |
| `resource_id` | Route param or response body `id` |
| `timestamp` | `Date.now()` at interceptor entry, before handler execution |
| `request_hash` | SHA-256 of `method + url + sorted(body)` |

### Audit Log Row Structure

Written to the `audit_log` table (see Section 7) after the handler resolves successfully:

| Column | Computation |
|--------|-------------|
| `sequence` | BIGINT GENERATED ALWAYS AS IDENTITY — database-assigned, monotonic |
| `prev_hash` | SHA-256 of the previous row's `(sequence, timestamp, actor_id, action, resource_type, resource_id, request_hash, entry_hash)` serialized as a deterministic JSON string. For `sequence = 1`, `prev_hash = sha256('')`. |
| `entry_hash` | SHA-256 of this row's `(sequence, timestamp, actor_id, action, resource_type, resource_id, request_hash, prev_hash)` |
| `signature` | HMAC-SHA-256 computed by Tink's `Mac` primitive over `entry_hash`, using the audit MAC keyset (`INSECURE-DEV-ONLY.mac.keyset.json` in dev, `vault-audit-mac` KMS key in prod). **This keyset is distinct from the data encryption keyset.** |

The service account has INSERT-only access to `audit_log`. No UPDATE or DELETE is granted.

### `/audit/verify` Endpoint

`GET /audit/verify?from=1&to=<N>` (defaults to full chain if params omitted).

Algorithm:
1. Fetch all rows in sequence order.
2. For each row, recompute `prev_hash`, `entry_hash`, and verify `signature`.
3. Check that `sequence` increments by exactly 1.
4. Return:

```jsonc
{
  "status": "full" | "partial" | "failed",
  "checkedRows": 1024,
  "firstDivergentSequence": null  // or the sequence number where failure begins
}
```

- `full`: all rows pass.
- `partial`: rows up to `firstDivergentSequence - 1` pass; the chain is broken at or after that point.
- `failed`: first row fails (e.g., genesis `prev_hash` mismatch).

### audit-core Package

Storage-agnostic. Two storage adapters:

- `InMemoryAuditStorage` — for unit tests; no database dependency.
- `DrizzleAuditStorage` — production adapter using the Drizzle ORM instance injected by NestJS.

Public API:

```ts
export interface AuditEntry { /* all fields listed above */ }
export interface AuditStorage {
  append(entry: Omit<AuditEntry, 'sequence' | 'prev_hash' | 'entry_hash' | 'signature'>): Promise<AuditEntry>;
  getAll(from?: number, to?: number): Promise<AuditEntry[]>;
  getLatest(): Promise<AuditEntry | null>;
}
export function verifyChain(entries: AuditEntry[], macKeyset: MacKeysetHandle): Promise<VerifyChainResult>;
```

---

## 6. Zod Validation Pipe Specification

### Global Pipe

`ZodValidationPipe` is registered globally in `AppModule.providers`. It intercepts all incoming arguments annotated with `@ZodBody()`, `@ZodQuery()`, or `@ZodParam()` and validates them against the Zod schema passed to the decorator.

### Schema Location

All schemas live in `packages/shared-types`. Each schema file exports a `z.object(...)` schema and the inferred TypeScript type:

```ts
// packages/shared-types/src/record.schema.ts
export const CreateRecordSchema = z.object({
  tenantId: z.string().uuid(),
  ownerId: z.string().uuid(),
  payload: z.record(z.unknown()),
});
export type CreateRecordDto = z.infer<typeof CreateRecordSchema>;
```

### Request + Response Validation

- **Request:** `@ZodBody(CreateRecordSchema)` replaces `@Body()`. The pipe validates before the handler runs.
- **Response:** A `ZodResponseInterceptor` validates the handler's return value against a response schema registered via a `@ZodResponse(ResponseSchema)` controller decorator before sending. Validation failures on the response side log a `CRITICAL` structured error and return a 500 with an RFC 7807 body (never leaking the raw validation error to the client).

### Custom Decorators

```ts
@ZodBody(schema)   // validates req.body against schema
@ZodQuery(schema)  // validates req.query against schema
@ZodParam(schema)  // validates req.params against schema
```

Implemented as NestJS `createParamDecorator` + `Pipe` pairs. The schema reference is stored in decorator metadata; `ZodValidationPipe` reads it via `Reflect.getMetadata`.

### Error Responses — RFC 7807

Validation failures produce:

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/problem+json

{
  "type": "https://vault.example.com/problems/validation-error",
  "title": "Validation Error",
  "status": 422,
  "detail": "Request body failed schema validation.",
  "errors": [
    { "path": ["tenantId"], "message": "Invalid uuid" }
  ]
}
```

All other errors (404, 401, 500) also use `application/problem+json` via the global `HttpExceptionFilter`.

---

## 7. Data Model (Drizzle ORM + Postgres)

All tables use Drizzle schema definitions in `apps/vault-api/src/db/schema.ts`. Migrations are generated and run via `drizzle-kit`. No raw SQL migration files. Schema is compatible with Cloud SQL for Postgres (no extensions beyond `pgcrypto`, which is available on Cloud SQL; `uuid_generate_v4()` is replaced by `gen_random_uuid()` which requires no extension on Postgres 13+).

### `tenants`

```ts
export const tenants = pgTable('tenants', {
  id:         uuid('id').primaryKey().defaultRandom(),
  name:       varchar('name', { length: 255 }).notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
});
```

### `users`

```ts
export const users = pgTable('users', {
  id:        uuid('id').primaryKey().defaultRandom(),
  tenantId:  uuid('tenant_id').notNull().references(() => tenants.id),
  email:     varchar('email', { length: 320 }).notNull().unique(),
  role:      varchar('role', { length: 50 }).notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

### `records`

```ts
export const records = pgTable('records', {
  id:               uuid('id').primaryKey().defaultRandom(),
  tenantId:         uuid('tenant_id').notNull().references(() => tenants.id),
  ownerId:          uuid('owner_id').notNull().references(() => users.id),
  encryptedPayload: jsonb('encrypted_payload').notNull(), // EncryptedEnvelope
  keyVersion:       varchar('key_version', { length: 50 }).notNull(),
  tinkKeyId:        integer('tink_key_id').notNull(),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
  version:          integer('version').notNull().default(1),
});
```

`version` supports optimistic concurrency: update requests must supply the current version; a mismatch returns 409.

### `audit_log`

```ts
export const auditLog = pgTable('audit_log', {
  sequence:     bigserial('sequence', { mode: 'bigint' }).primaryKey(),
  timestamp:    timestamp('timestamp').notNull(),
  actorId:      uuid('actor_id').notNull(),
  action:       varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId:   uuid('resource_id'),
  requestHash:  varchar('request_hash', { length: 64 }).notNull(),
  prevHash:     varchar('prev_hash', { length: 64 }).notNull(),
  entryHash:    varchar('entry_hash', { length: 64 }).notNull(),
  signature:    text('signature').notNull(), // base64 Tink MAC
});
```

No UPDATE or DELETE is granted on `audit_log` to the application service account.

### Migrations

`drizzle-kit generate:pg` produces numbered migration files in `apps/vault-api/src/db/migrations/`. Applied at startup via `drizzle-kit push` in dev and a migration runner in the prod container entrypoint.

---

## 8. Cross-Cutting Concerns

### Global Providers (registered in AppModule)

| Provider | Scope | Purpose |
|----------|-------|---------|
| `ZodValidationPipe` | Global pipe | Schema validation on all incoming parameters |
| `AuditInterceptor` | Global interceptor | Append-only audit trail for every mutating request |
| `LoggingInterceptor` | Global interceptor | Structured JSON request/response logs with correlation IDs |
| `HttpExceptionFilter` | Global filter | RFC 7807 `application/problem+json` error envelopes |
| `ThrottlerGuard` | Global guard | Rate limiting via `@nestjs/throttler` |

### Correlation IDs

`LoggingInterceptor` reads `X-Request-ID` from the incoming request (or generates a UUIDv4 if absent) and attaches it to `AsyncLocalStorage`. All log calls within the request lifecycle include `{ requestId }` in structured output. The ID is echoed back in the `X-Request-ID` response header.

### Safe Log Utility

`apps/vault-api/src/common/safe-log/safe-log.ts` exports `safeLog(obj: unknown): unknown`. It deep-clones the object and redacts any value at a key matching registered PII patterns:

```ts
const PII_KEY_PATTERNS = [/email/i, /phone/i, /ssn/i, /dob/i, /address/i, /payload/i];
```

Matched values are replaced with `[REDACTED]`. `LoggingInterceptor` runs all loggable data through `safeLog` before emitting. Decrypted payloads are never logged.

### Structured JSON Logging

All log output uses NestJS's `LoggerService` wired to a custom `GcpStructuredLogger` that emits JSON conforming to Google Cloud Logging's structured format:

```jsonc
{
  "severity": "INFO",                               // Cloud Logging field
  "message": "Record created",
  "logging.googleapis.com/insertId": "<uuid>",
  "logging.googleapis.com/trace": "projects/my-project/traces/<trace-id>",
  "logging.googleapis.com/spanId": "<span-id>",
  "labels": { "service": "vault-api", "version": "1.2.3" },
  "requestId": "<correlation-id>",
  "timestamp": "2026-04-09T12:00:00.000Z"
}
```

On local dev (stdout), this JSON is readable as-is and importable into Cloud Logging without adapters.

### Rate Limiting

`@nestjs/throttler` configured at 100 requests / 60 seconds per IP. Applied globally. The `records/` module may apply tighter limits (20 req / 60 s) via route-level `@Throttle()`.

### Security Headers (Admin Console)

The Angular 21 admin-console is served with Helmet middleware (`helmet`) configured for:
- `Content-Security-Policy` with `script-src 'self'`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`

---

## 9. CI/CD Pipeline

All workflows live in `.github/workflows/`. Node 20 LTS, Yarn 4 (berry, PnP disabled, `nodeLinker: node-modules`).

### `ci.yml` — Lint, Typecheck, Unit Test, Build

Triggers: push to any branch, PR to `main`.

Steps:
1. `yarn install --immutable`
2. `yarn workspaces foreach -A run lint` (ESLint + Prettier check)
3. `yarn workspaces foreach -A run typecheck` (tsc --noEmit)
4. `yarn workspaces foreach -A run test` (Jest, unit tests only, no Docker)
5. `yarn workspaces foreach -A run build`

### `security.yml` — Static Analysis and Dependency Scanning

Triggers: push to `main`, weekly schedule.

Steps:
1. **CodeQL** — `actions/codeql-action` on TypeScript source.
2. **npm audit** — `yarn npm audit --all --recursive --severity high`; fails on high/critical.
3. **gitleaks** — `gitleaks/gitleaks-action` to detect committed secrets (the dev Tink keyset is explicitly allowlisted by rule, since it is intentionally committed and labeled).
4. **Trivy** — image vulnerability scan on `vault-api` Dockerfile; fails on CRITICAL CVEs.

### `e2e.yml` — End-to-End Round-Trip Tests

Triggers: push to `main`, PR to `main`.

Steps:
1. `docker compose up -d` (Postgres 16 + `vault-api` with dev Tink keyset).
2. Wait for healthcheck (`/health` endpoint returns 200).
3. Run `yarn workspace vault-api test:e2e` (Jest + Supertest against the live container).
   - Encrypted round-trip: create record → retrieve → assert plaintext matches original.
   - Audit chain verification: verify `/audit/verify` returns `status: "full"` after mutations.
   - Tamper detection: flip a bit in `entry_hash` via direct DB query → assert `/audit/verify` returns `status: "failed"` with the correct `firstDivergentSequence`.
   - AAD mismatch: attempt decrypt with wrong `tenant_id` → assert recognizable error.
4. `docker compose down -v`.

### `release.yml` — Semantic Release and SBOM

Triggers: push to `main` (after `ci.yml` passes).

Steps:
1. **semantic-release** — reads conventional commits; bumps version, creates GitHub release, generates CHANGELOG.
2. **Docker build + push** — builds `vault-api` image, pushes to GHCR (`ghcr.io/<owner>/secure-data-vault/vault-api:<version>`).
3. **SBOM generation** — `anchore/sbom-action` (Syft) generates an SPDX SBOM and attaches it to the GitHub release.

---

## 10. Agentic Context System

### CLAUDE.md

Project-level context file for Claude Code. Includes:
- Project identity and purpose.
- Monorepo workspace layout and package responsibilities.
- Strict rules: never log decrypted payloads; always pass AAD on every Tink call; keep crypto-core exports minimal; audit-core must remain storage-agnostic.
- Run commands: `yarn install`, `docker compose up`, `yarn test`, `yarn build`.
- Key architectural decisions (Tink keyset versioning, RFC 7807 errors, Cloud SQL compatibility constraints).

### AGENTS.md

Agent registry defining routing rules. Maps task types to subagents:
- Security review tasks → `.agents/security-reviewer.md`
- Migration authoring → `.agents/migration-author.md`
- Test authoring → `.agents/test-author.md`

### `.context/`

Persistent markdown files for agent context:
- `architecture.md` — system diagram, data flow, package dependency graph.
- `threat-model.md` — full threat table (mirrors Section 2).
- `decisions.md` — Architecture Decision Records (ADRs) in MADR format.

### `.agents/security-reviewer.md`

Specialized subagent for PR security review. Responsibilities:
- Detect Tink API misuse (e.g., `encrypt()` called without AAD, raw AES instead of Tink primitives).
- Flag AAD omission or incorrect AAD construction.
- Detect keyset confusion (data keyset used for MAC or vice versa).
- Identify log leakage of decrypted payloads or PII.
- Flag missing authentication/authorization guards on new routes.
- Verify that any new mutating endpoint is covered by `AuditInterceptor`.

### `.agents/migration-author.md`

Specialized subagent for Drizzle migrations. Responsibilities:
- Generate Drizzle migration files via `drizzle-kit generate:pg`.
- Verify Cloud SQL for Postgres compatibility (no unsupported extensions, no `CREATE EXTENSION` beyond `pgcrypto`).
- Ensure `audit_log` never receives ALTER TABLE that adds UPDATE/DELETE capability.
- Include rollback commentary for every migration.

### `.agents/test-author.md`

Specialized subagent for test authoring. Responsibilities:
- Write crypto-core round-trip tests using the `INSECURE-DEV-ONLY` keyset.
- Write tests verifying the Tink primitive template is `AES256_GCM` with 256-bit keys.
- Write multi-version keyset tests proving rotation leaves old records readable.
- Write audit-core chain-integrity property tests using fast-check.
- Write negative tests: tampered audit row, wrong AAD, missing key_version.

### `mcp-config/`

`mcp-config/mcp.json` — MCP server configuration for tool integrations used during agentic sessions (e.g., filesystem, GitHub).

---

## 11. Testing Strategy

### Unit Tests — crypto-core (`packages/crypto-core/test/`)

| Test | Assertion |
|------|-----------|
| Round-trip with dev keyset | `decrypt(encrypt(plaintext, ctx), ctx) === plaintext` |
| Template verification | Tink keyset primary key template is `AES256_GCM`; key size is 256 bits |
| AAD binding | `decrypt(envelope, { ...ctx, tenantId: 'other' })` throws `SecurityException` |
| Key rotation | Multi-version keyset: records encrypted under key v1 decrypt correctly after v2 is added as primary |
| Dev mode warning | `INSECURE-DEV-ONLY` log warning is emitted exactly once on first `encrypt()` call in dev mode |

### Unit Tests — audit-core (`packages/audit-core/test/`)

| Test | Assertion |
|------|-----------|
| Append + verify | Chain of N entries passes `verifyChain()` |
| Tamper detection (fast-check) | Property: any mutation of any field in any row causes `verifyChain()` to fail and identify the correct sequence number |
| Insertion detection | Inserting a row at position K causes failure at sequence K |
| Deletion detection | Removing row K causes failure at sequence K+1 |
| Replay detection | Duplicate `sequence` value causes failure |

fast-check generates arbitrary chains and arbitrary tamper positions.

### Service Tests — vault-api (`apps/vault-api/src/**/*.spec.ts`)

- `@nestjs/testing` `TestingModule` for all controllers, services, and interceptors.
- Mocked `CryptoService` (wrapping crypto-core) and mocked `AuditService`.
- Test every controller route: happy path, validation failure (assert 422 + RFC 7807), auth failure (assert 401).
- `AuditInterceptor` spec: assert audit entry is written for POST/PUT/PATCH/DELETE; assert no entry written for GET.

### E2E Tests (`apps/vault-api/test/`)

Run against `docker compose up` (see Section 9). Tests:
1. **Encrypted round-trip:** `POST /records` → `GET /records/:id` → plaintext payload matches original.
2. **Audit chain verify:** After 10 record mutations, `GET /audit/verify` returns `{ status: 'full' }`.
3. **Tamper detection:** Direct Postgres UPDATE flips a bit in `entry_hash`; `GET /audit/verify` returns `{ status: 'failed', firstDivergentSequence: N }`.
4. **AAD mismatch:** Directly query encrypted_payload, attempt programmatic decrypt with wrong `tenant_id`; assert Tink throws.
5. **Missing key_version:** Null out `key_version` in a record; assert decrypt fails with a recognizable `MissingKeyVersionError`.

### Negative Tests

Covered across the above suites. Explicitly required:
- Tampered audit rows fail verification with identified sequence number.
- Wrong AAD fails decrypt with Tink `SecurityException`.
- Missing `key_version` fails decrypt with `MissingKeyVersionError` (custom error class, not a generic 500).

---

## 12. README Specification

### Structure

1. **Hero** — tagline + one-paragraph pitch. Concise statement of what the repo proves.

2. **Why This Exists** — honest extraction statement: "This is a sanitized reference architecture derived from patterns used in production compliance-sensitive systems. No real client data, PHI, or internal configuration is included."

3. **Threat Model Diagram** — Mermaid `graph TD` showing: Client → API → ZodValidationPipe → Service → CryptoService (Tink) → Postgres; KMS → CryptoService; AuditInterceptor → audit_log. Annotated with threat mitigations.

4. **Envelope Encryption Explainer** — prose + Mermaid sequence diagram:
   ```
   encrypt(plaintext) →
     Tink generates DEK →
     AES-256-GCM encrypt plaintext with DEK + AAD →
     KMS wraps DEK →
     store { ciphertext, wrappedDEK, keyVersion, tinkKeyId }
   ```
   Emphasizes: master key never leaves KMS; plaintext DEK never touches disk.

5. **Audit Chain Explainer** — prose + Mermaid sequence diagram showing append flow and `prev_hash` linkage. Notes that HMAC is from a separate keyset.

6. **Quickstart** — assumes Docker and Node 20. No GCP account required.
   ```bash
   git clone https://github.com/<owner>/secure-data-vault
   cd secure-data-vault
   yarn install
   docker compose up        # Postgres + vault-api with dev Tink keyset
   yarn test                # all unit + integration tests
   # Open http://localhost:4200 for the admin console
   ```

7. **How to Adapt to Your Domain** — points to `packages/shared-types`. Instructions for replacing the sample Zod schemas with domain-specific ones. Notes that `crypto-core` and `audit-core` are domain-agnostic.

8. **GCP Deployment** — step-by-step pointing at `infra/`:
   - Create a GCP project.
   - `terraform apply` in `infra/` (provisions KMS key ring, Cloud SQL instance, Cloud Logging sinks, service accounts).
   - Set `CRYPTO_CORE_MODE=prod` and `KMS_KEY_URI` in the Cloud Run service environment.
   - Deploy `vault-api` Docker image to Cloud Run.

9. **Security Notes** — reiterates that the dev Tink keyset (`INSECURE-DEV-ONLY.keyset.json`) must never be used in production.

---

## 13. Acceptance Criteria

| # | Criterion | Pass Condition |
|---|-----------|----------------|
| 1 | Clean build | `yarn install && yarn build` succeeds on a clean clone with no local state. |
| 2 | Docker stack | `docker compose up` brings Postgres + vault-api online and healthcheck passes within 60 seconds. |
| 3 | All tests pass | `yarn test` (unit + integration) exits 0. |
| 4 | E2E round-trip | Encrypted record created, retrieved, and decrypted in E2E test with plaintext fidelity. |
| 5 | Audit verify — clean chain | `/audit/verify` returns `{ status: 'full' }` after 10 record mutations in E2E test. |
| 6 | Tamper detection | A deliberate bit-flip on a stored `audit_log` row causes `/audit/verify` to return `{ status: 'failed', firstDivergentSequence: N }` with the correct N. |
| 7 | AAD mismatch error | Programmatic decrypt with wrong `tenant_id` throws a recognizable error (not a generic 500). |
| 8 | crypto-core publishable | `packages/crypto-core` has its own `README.md`, correct `exports` in `package.json`, and `yarn workspace crypto-core build` produces standalone dist. |
| 9 | audit-core publishable | Same as above for `packages/audit-core`. |
| 10 | Admin console renders | Angular 21 SPA at `http://localhost:4200` loads, lists records, creates a record, views audit chain — all using Spartan UI components + Tailwind v4 styling. |
| 11 | CI green on first push | All four GitHub Actions workflows (ci, security, e2e, release) pass without modifications after initial push to a fresh GitHub repository. |

---

## 14. Sanitization Checklist

Before any commit reaches the public repository, verify:

- [ ] No references to "Quiet Horizons", any real healthcare client, or any internal system name.
- [ ] No PHI or PII in seed data or fixtures. Faker-generated fields only (`faker.person.fullName()`, `faker.internet.email()`, `faker.lorem.sentence()`). Field names are domain-neutral (`notes`, not `diagnosis`, `patientId`, etc.).
- [ ] No references to real HIPAA audit reports, internal compliance documentation, or client-specific compliance requirements.
- [ ] No real Cloud KMS key resource names (e.g., `projects/real-project/locations/us/keyRings/...`). All KMS URIs in docs and Terraform use placeholder values (`projects/YOUR_GCP_PROJECT/...`).
- [ ] No real GCP project IDs, no real service account emails, no real internal endpoints.
- [ ] The committed dev Tink keyset file is named `INSECURE-DEV-ONLY.keyset.json`.
- [ ] The dev keyset README section explicitly states it must never be used in production.
- [ ] `crypto-core` emits a `WARN` log on first use of the dev keyset: `[crypto-core] INSECURE-DEV-ONLY keyset loaded — never use in production`.
- [ ] A separate `INSECURE-DEV-ONLY.mac.keyset.json` exists for the audit HMAC and is similarly labeled.
- [ ] `docker-compose.yml` volume mounts for dev keysets are commented with `# DEV ONLY — never mount real keysets here`.
