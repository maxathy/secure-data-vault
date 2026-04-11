import { createHash } from 'node:crypto';
import type { AuditEntry } from './types.js';

/**
 * Compute the prev_hash for a new entry: SHA-256 of the previous entry's
 * serialized fields. For the genesis entry (no previous), returns SHA-256
 * of the empty string.
 */
export function computePrevHash(previousEntry: AuditEntry | null): string {
  if (!previousEntry) {
    return createHash('sha256').update('').digest('hex');
  }
  const payload = canonicalize({
    sequence: previousEntry.sequence.toString(),
    timestamp: previousEntry.timestamp,
    actorId: previousEntry.actorId,
    action: previousEntry.action,
    resourceType: previousEntry.resourceType,
    resourceId: previousEntry.resourceId,
    requestHash: previousEntry.requestHash,
    entryHash: previousEntry.entryHash,
  });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Compute the entry_hash for an entry: SHA-256 of the entry's own fields
 * (including prevHash, excluding entryHash and signature).
 */
export function computeEntryHash(entry: Omit<AuditEntry, 'entryHash' | 'signature'>): string {
  const payload = canonicalize({
    sequence: entry.sequence.toString(),
    timestamp: entry.timestamp,
    actorId: entry.actorId,
    action: entry.action,
    resourceType: entry.resourceType,
    resourceId: entry.resourceId,
    requestHash: entry.requestHash,
    prevHash: entry.prevHash,
  });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Deterministic JSON serialization: sorted keys, no whitespace.
 * Ensures hash stability regardless of property insertion order.
 */
function canonicalize(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj).sort();
  const entries: Record<string, unknown> = {};
  for (const key of sorted) {
    entries[key] = obj[key];
  }
  return JSON.stringify(entries);
}
