import type { AuditEntry, AuditEntryInput, AuditStorage } from './types.js';
import { computePrevHash, computeEntryHash } from './chain.js';
import { signEntryHash } from './hmac.js';

/**
 * Append-only audit log that maintains a hash chain and HMAC signatures.
 *
 * Each new entry links to the previous entry via prevHash, computes its
 * own entryHash, and signs the entryHash with a dedicated MAC key.
 * The storage adapter handles persistence; this class handles the
 * cryptographic chain logic.
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
    const latest = await this.storage.getLatest();
    const prevHash = computePrevHash(latest);

    // We need to compute entryHash, but we don't have the sequence yet.
    // The storage adapter assigns the sequence. We pass a placeholder
    // and the storage adapter will recompute with the real sequence.
    // However, for correctness, we let the storage adapter call back
    // to get the final hash. For simplicity, we use a two-phase approach:
    // 1. Append with temporary values
    // 2. The in-memory storage assigns sequence and we compute the rest

    // For the storage contract, we pass all fields except sequence.
    // The storage adapter assigns sequence, then we finalize.
    const partialEntry = {
      ...input,
      prevHash,
      // Placeholder — will be recomputed by storage after sequence assignment
      entryHash: '',
      signature: '',
    };

    // Storage assigns sequence, then we compute entryHash and signature
    const entry = await this.storage.append(partialEntry);

    // Recompute entryHash with the real sequence
    const entryHash = computeEntryHash({
      sequence: entry.sequence,
      timestamp: entry.timestamp,
      actorId: entry.actorId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      requestHash: entry.requestHash,
      prevHash: entry.prevHash,
    });
    const signature = signEntryHash(entryHash, this.macKey);

    // Update the entry with computed values
    entry.entryHash = entryHash;
    entry.signature = signature;

    return entry;
  }
}
