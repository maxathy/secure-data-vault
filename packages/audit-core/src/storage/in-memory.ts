import type { AuditEntry, AuditStorage } from '../types.js';

/**
 * In-memory audit storage adapter for unit tests.
 * Entries are stored in an array with auto-incrementing sequence numbers.
 * Not suitable for production — use DrizzleAuditStorage instead.
 */
export class InMemoryAuditStorage implements AuditStorage {
  private entries: AuditEntry[] = [];
  private nextSequence = 1n;

  async append(entry: Omit<AuditEntry, 'sequence'>): Promise<AuditEntry> {
    const fullEntry: AuditEntry = {
      ...entry,
      sequence: this.nextSequence++,
    };
    this.entries.push(fullEntry);
    return fullEntry;
  }

  async getRange(from?: bigint, to?: bigint): Promise<AuditEntry[]> {
    return this.entries.filter((e) => {
      if (from !== undefined && e.sequence < from) return false;
      if (to !== undefined && e.sequence > to) return false;
      return true;
    });
  }

  async getLatest(): Promise<AuditEntry | null> {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1]! : null;
  }

  /** Direct access to the internal entries array — for test tampering. */
  getEntries(): AuditEntry[] {
    return this.entries;
  }
}
