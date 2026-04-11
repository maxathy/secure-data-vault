# Architecture Decision Records

## ADR-001: Node.js Native Crypto over Google Tink

**Status:** Accepted  
**Date:** 2026-04-11

**Context:**  
The initial design referenced `@google-cloud/tink-typescript` for envelope encryption. Investigation revealed:

- `@google-cloud/tink-typescript` does not exist as a published package
- `tink-crypto` (v0.1.1) is an unmaintained WASM port with no updates since 2022
- Tink's Java/Go/C++ implementations are mature, but the TypeScript ecosystem has no production-ready option

**Decision:**  
Use Node.js built-in `crypto` module to implement AES-256-GCM envelope encryption. The keyset JSON format mirrors Tink's concepts (keysetHandle, keyId, key status, key templates) for familiarity.

**Consequences:**

- Zero runtime dependencies in crypto-core — auditable, portable, fast
- Demonstrates deeper cryptographic understanding than wrapping a library
- Must manually implement: key rotation logic, DEK wrapping, AAD binding, memory zeroing
- Production deployments should integrate Cloud KMS for KEK unwrapping (keyset-loader already has the prod code path)

---

## ADR-002: Drizzle ORM over Prisma / TypeORM

**Status:** Accepted  
**Date:** 2026-04-11

**Context:**  
NestJS traditionally pairs with TypeORM or Prisma. Both have trade-offs:

- TypeORM: decorator-heavy, runtime schema, poor TypeScript inference
- Prisma: code generation step, binary engine dependency, limited raw SQL escape hatches

**Decision:**  
Use Drizzle ORM for type-safe, SQL-like query building with zero code generation.

**Consequences:**

- Schema defined in TypeScript (`src/db/schema.ts`) — single source of truth
- `drizzle-kit` handles migrations via `push` (dev) or `generate` + `migrate` (prod)
- SQL-like API is transparent — what you write is what executes
- Smaller community than Prisma, but growing rapidly

---

## ADR-003: Yarn 4 Workspaces over Nx / Turborepo

**Status:** Accepted  
**Date:** 2026-04-11

**Context:**  
Monorepo tooling options: Nx, Turborepo, Lerna, or native package manager workspaces. This is a reference project, not a 50-package enterprise monorepo.

**Decision:**  
Use Yarn 4 with native workspaces. No additional build orchestration layer.

**Consequences:**

- Zero additional tooling to learn or configure
- `workspace:*` protocol for internal dependencies
- Topological build order via `yarn workspaces foreach -At run build`
- If the project grows significantly, Turborepo can be layered on top without restructuring

---

## ADR-004: Separate Encryption and MAC Keysets

**Status:** Accepted  
**Date:** 2026-04-11

**Context:**  
A single keyset could be used for both AES-256-GCM encryption and HMAC-SHA-256 audit signing. This is a keyset confusion risk — using the same key material for different cryptographic purposes violates best practices (NIST SP 800-57).

**Decision:**  
Maintain two separate keysets:

- `INSECURE-DEV-ONLY.keyset.json` — encryption keys (AES-256-GCM)
- `INSECURE-DEV-ONLY.mac.keyset.json` — MAC keys (HMAC-SHA-256)

**Consequences:**

- Each keyset can rotate independently
- Cloud KMS maps to two separate crypto keys with different purposes (ENCRYPT_DECRYPT vs MAC)
- Slightly more configuration, but eliminates a class of cryptographic misuse

---

## ADR-005: RFC 7807 Problem Details for All Errors

**Status:** Accepted  
**Date:** 2026-04-11

**Context:**  
REST APIs commonly return ad-hoc error formats (`{ error: "...", message: "..." }`), making client-side error handling inconsistent.

**Decision:**  
All error responses use [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) `application/problem+json` format with `type`, `title`, `status`, `detail`, and optional `instance` (correlation ID) and `errors` (validation details).

**Consequences:**

- Single `HttpExceptionFilter` handles all error formatting
- Clients can rely on a consistent error contract
- Zod validation errors include per-field details in the `errors` array
- The `instance` field carries the X-Request-ID for support correlation

---

## ADR-006: Property-Based Testing for Tamper Detection

**Status:** Accepted  
**Date:** 2026-04-11

**Context:**  
Unit tests for audit chain verification can only test specific tamper scenarios the author imagines. A determined attacker might find mutations that pass verification.

**Decision:**  
Use `fast-check` for property-based testing: generate random audit chains (3-15 entries), mutate a random field at a random position, and assert verification always fails.

**Consequences:**

- 100 random scenarios per test run, covering mutations the author didn't explicitly imagine
- Tests are slower (~2s) but provide much stronger guarantees
- Complements (not replaces) explicit unit tests for specific scenarios
