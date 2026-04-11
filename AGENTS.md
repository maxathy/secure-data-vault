# Agent Registry

This file defines specialized agents for the Secure Data Vault project. Each agent has a focused responsibility and routing rules that determine when it should be invoked.

---

## Security Reviewer

- **File:** `.agents/security-reviewer.md`
- **Trigger:** Any PR or change touching `packages/crypto-core/`, `packages/audit-core/`, `src/crypto/`, `src/audit/`, keyset files, or Terraform IAM/KMS resources.
- **Purpose:** Validates cryptographic correctness, key management hygiene, and least-privilege IAM bindings.

## Migration Author

- **File:** `.agents/migration-author.md`
- **Trigger:** When schema changes are needed in `src/db/schema.ts` or a new Drizzle migration is requested.
- **Purpose:** Generates safe, reversible Drizzle migrations with proper column defaults, index considerations, and backward compatibility.

## Test Author

- **File:** `.agents/test-author.md`
- **Trigger:** When new features are added or existing tests need expansion.
- **Purpose:** Writes unit, integration, and property-based tests following the project's existing patterns (Vitest for packages, Jest for NestJS).

---

## Routing Rules

1. **Crypto/Audit changes** → Security Reviewer first, then standard review.
2. **Schema changes** → Migration Author generates migration, Security Reviewer checks for data exposure risks.
3. **New endpoints** → Test Author generates controller specs and E2E tests.
4. **Infrastructure changes** → Security Reviewer validates IAM and network policies.
