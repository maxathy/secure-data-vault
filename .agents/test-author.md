# Test Author Agent

## Role

You write tests for the Secure Data Vault project, following established patterns and ensuring comprehensive coverage of security-critical paths.

## When to Activate

- When a new feature or endpoint is added
- When a bug fix needs a regression test
- When test coverage gaps are identified

## Test Framework Map

| Location                | Framework         | Runner          | Pattern              |
| ----------------------- | ----------------- | --------------- | -------------------- |
| `packages/crypto-core/` | Jest + ts-jest    | `yarn test`     | `test/*.spec.ts`     |
| `packages/audit-core/`  | Jest + ts-jest    | `yarn test`     | `test/*.spec.ts`     |
| `apps/vault-api/` unit  | Jest + ts-jest    | `yarn test`     | `src/**/*.spec.ts`   |
| `apps/vault-api/` E2E   | Jest + supertest  | `yarn test:e2e` | `test/*.e2e-spec.ts` |
| Property-based          | fast-check + Jest | `yarn test`     | `*.property.spec.ts` |

## Patterns to Follow

### Unit Tests (crypto-core, audit-core)

- Test the public API, not internal functions
- Use descriptive `describe`/`it` blocks: `describe('encrypt', () => { it('should produce ciphertext different from plaintext', ...) })`
- Always test error cases (wrong key, wrong AAD, tampered data)
- For crypto: always verify round-trip (encrypt → decrypt → equals original)
- For audit: always verify chain integrity after operations

### Controller Specs (vault-api)

- Use NestJS `Test.createTestingModule` with mocked services
- Test Zod validation by sending invalid payloads
- Test RFC 7807 error format in responses
- Test `@AuditAction` decorator presence (metadata reflection)

### E2E Tests (vault-api)

- Use real in-memory database (not mocks)
- Test full request lifecycle: create → read → verify
- Test optimistic concurrency (409 on stale version)
- Test audit chain verification endpoint

### Property-Based Tests

- Use `fast-check` arbitraries that match domain constraints
- Keep `numRuns` at 100 for CI speed
- Name properties clearly: `'any single-field mutation in a valid chain is detected'`

## Security Test Requirements

Every feature touching encrypted data must have tests for:

1. **Round-trip correctness** — encrypt → decrypt → equals original
2. **AAD binding** — decrypt with wrong tenant/record ID fails
3. **Key rotation** — old ciphertext still decrypts after rotation
4. **No plaintext leakage** — ciphertext is not equal to plaintext
5. **Audit trail** — mutating operations produce audit entries
