# secure-data-vault

Reference architecture for storing regulated data with application-layer encryption and tamper-evident audit trails.

## Workspace Layout

Yarn 4 monorepo with `nodeLinker: node-modules`.

| Workspace | Purpose |
|-----------|---------|
| `packages/shared-types` | Zod schemas + inferred TS types for all API boundaries |
| `packages/crypto-core` | AES-256-GCM envelope encryption (zero external deps) |
| `packages/audit-core` | Hash-chained audit log with HMAC-SHA-256 (zero external deps) |
| `apps/vault-api` | NestJS 11 API backed by Postgres 16 via Drizzle ORM |
| `apps/admin-console` | Angular 21 SPA for record management and audit inspection |

## Strict Rules

1. **Never log decrypted payloads.** All loggable data passes through `safeLog()` which redacts PII-matching keys. Decrypted payloads must only appear in HTTP response bodies.
2. **Always pass AAD on every encrypt/decrypt call.** The AAD is `recordId:tenantId` — omitting it breaks the transplant-attack protection.
3. **Keep crypto-core exports minimal.** Only `encrypt`, `decrypt`, `loadEncryptionKeyset`, `loadMacKeyset`, types, and errors. No raw key material or internal Tink primitives.
4. **audit-core must remain storage-agnostic.** It defines the `AuditStorage` interface; adapters live in the consuming app.
5. **All errors use RFC 7807.** The global `HttpExceptionFilter` enforces `application/problem+json` on every response.

## Run Commands

```bash
yarn install            # Install all workspace dependencies
yarn build              # Build packages (topological) then apps
yarn test               # Run all unit tests
docker compose up -d    # Postgres 16 + vault-api with dev keyset
yarn workspace @secure-data-vault/vault-api test:e2e  # E2E tests (needs Postgres)
```

## Key Decisions

- **Native crypto over Tink library:** `crypto-core` uses Node.js built-in `crypto` module for AES-256-GCM. Tink for TypeScript is unmaintained. The envelope encryption pattern is identical.
- **Drizzle over TypeORM:** Type-safe queries, lighter footprint, better composability.
- **Yarn over pnpm:** `workspace:*` protocol, well-understood hoisting for CI caching.
- **Separate MAC keyset:** The audit HMAC key (`INSECURE-DEV-ONLY.mac.keyset.json`) is distinct from the encryption keyset to prevent keyset confusion.
