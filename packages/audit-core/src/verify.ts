import type { AuditEntry, VerifyChainResult } from './types.js';
import { computePrevHash, computeEntryHash } from './chain.js';
import { verifySignature } from './hmac.js';

/**
 * Verify the integrity of an audit chain.
 *
 * For each entry, checks:
 * 1. Sequence increments by exactly 1 (no gaps, no duplicates)
 * 2. prevHash matches the SHA-256 of the previous entry
 * 3. entryHash matches the SHA-256 of the current entry's fields
 * 4. HMAC signature over entryHash is valid
 *
 * Returns a result indicating whether the full chain is valid, or
 * where the first divergence was detected.
 */
export function verifyChain(
  entries: AuditEntry[],
  macKey: Buffer,
): VerifyChainResult {
  if (entries.length === 0) {
    return { status: 'full', checkedRows: 0, firstDivergentSequence: null };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    const previousEntry = i > 0 ? entries[i - 1]! : null;

    // Check sequence continuity
    if (i > 0 && entry.sequence !== previousEntry!.sequence + 1n) {
      return makeResult(i === 0 ? 'failed' : 'partial', i, entry.sequence);
    }

    // Check prevHash
    const expectedPrevHash = computePrevHash(previousEntry);
    if (entry.prevHash !== expectedPrevHash) {
      return makeResult(i === 0 ? 'failed' : 'partial', i, entry.sequence);
    }

    // Check entryHash
    const expectedEntryHash = computeEntryHash({
      sequence: entry.sequence,
      timestamp: entry.timestamp,
      actorId: entry.actorId,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      requestHash: entry.requestHash,
      prevHash: entry.prevHash,
    });
    if (entry.entryHash !== expectedEntryHash) {
      return makeResult(i === 0 ? 'failed' : 'partial', i, entry.sequence);
    }

    // Check HMAC signature
    if (!verifySignature(entry.entryHash, entry.signature, macKey)) {
      return makeResult(i === 0 ? 'failed' : 'partial', i, entry.sequence);
    }
  }

  return { status: 'full', checkedRows: entries.length, firstDivergentSequence: null };
}

function makeResult(
  status: 'partial' | 'failed',
  checkedIndex: number,
  sequence: bigint,
): VerifyChainResult {
  return {
    status,
    checkedRows: checkedIndex,
    firstDivergentSequence: Number(sequence),
  };
}
