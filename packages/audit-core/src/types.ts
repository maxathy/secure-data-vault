/** A single entry in the hash-chained audit log. */
export interface AuditEntry {
  /** Database-assigned monotonically increasing sequence number. */
  sequence: bigint;
  /** Timestamp of the audited operation (ms since epoch). */
  timestamp: number;
  /** Identity of the actor who performed the operation. */
  actorId: string;
  /** Action identifier (e.g., 'records:create', 'users:delete'). */
  action: string;
  /** Type of the affected resource (e.g., 'record', 'user'). */
  resourceType: string;
  /** ID of the affected resource, if applicable. */
  resourceId: string | null;
  /** SHA-256 hash of the request (method + URL + sorted body). */
  requestHash: string;
  /** SHA-256 hash of the previous entry's serialized fields. */
  prevHash: string;
  /** SHA-256 hash of this entry's serialized fields (including prevHash). */
  entryHash: string;
  /** HMAC-SHA-256 signature over entryHash using the audit MAC key. */
  signature: string;
}

/** Fields provided by the caller when appending an audit entry. */
export type AuditEntryInput = Pick<
  AuditEntry,
  'timestamp' | 'actorId' | 'action' | 'resourceType' | 'resourceId' | 'requestHash'
>;

/** Result of verifying the audit chain integrity. */
export interface VerifyChainResult {
  /** 'full' = all rows pass; 'partial' = break detected; 'failed' = first row fails. */
  status: 'full' | 'partial' | 'failed';
  /** Number of rows that were checked. */
  checkedRows: number;
  /** Sequence number of the first row where verification failed, or null. */
  firstDivergentSequence: number | null;
}

/**
 * Storage adapter interface for the audit log.
 * Implementations must be append-only — no update or delete operations.
 */
export interface AuditStorage {
  /** Append a fully computed audit entry. Returns the entry with its assigned sequence. */
  append(entry: Omit<AuditEntry, 'sequence'>): Promise<AuditEntry>;
  /** Retrieve entries in sequence order, optionally bounded by from/to. */
  getRange(from?: bigint, to?: bigint): Promise<AuditEntry[]>;
  /** Retrieve the most recent entry, or null if the log is empty. */
  getLatest(): Promise<AuditEntry | null>;
}
