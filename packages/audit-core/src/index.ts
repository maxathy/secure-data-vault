export { AuditLog } from './audit-log.js';
export { verifyChain } from './verify.js';
export { computePrevHash, computeEntryHash } from './chain.js';
export { signEntryHash, verifySignature } from './hmac.js';
export { InMemoryAuditStorage } from './storage/in-memory.js';

export type { AuditEntry, AuditEntryInput, AuditStorage, VerifyChainResult } from './types.js';

export { ChainIntegrityError, SignatureVerificationError } from './errors.js';
