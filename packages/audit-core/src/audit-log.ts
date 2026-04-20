import type { AuditEntry, AuditEntryInput, AuditStorage } from './types.js';
import { computePrevHash, computeEntryHash } from './chain.js';
import { signEntryHash } from './hmac.js';

/**
 * Append-only audit log that maintains a hash chain and HMAC signatures.
 *
 * Each new entry links to the previous entry via prevHash, computes its
 * own entryHash, and signs the entryHash with a dedicated MAC key. The
 * storage adapter owns sequence assignment and atomicity; this class
 * owns the cryptographic chain logic.
 */
export class AuditLog {
  constructor(
    private readonly storage: AuditStorage,
    private readonly macKey: Buffer,
  ) {}

  /**
   * Append a new entry to the audit log.
   * Computes prevHash, entryHash, and HMAC signature automatically.
   */
  async append(input: AuditEntryInput): Promise<AuditEntry> {
    return this.storage.appendAtomic((latest, sequence) => {
      const prevHash = computePrevHash(latest);
      const unsigned = {
        sequence,
        timestamp: input.timestamp,
        actorId: input.actorId,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        requestHash: input.requestHash,
        prevHash,
      };
      const entryHash = computeEntryHash(unsigned);
      const signature = signEntryHash(entryHash, this.macKey);
      return { ...unsigned, entryHash, signature };
    });
  }
}
