import { Inject, Injectable } from '@nestjs/common';
import { gte, lte, and, desc, sql } from 'drizzle-orm';
import type { AuditEntry, AuditStorage } from '@secure-data-vault/audit-core';
import { DRIZZLE, type DrizzleDB } from '../db/drizzle.provider';
import { auditLog } from '../db/schema';

/**
 * Production audit storage adapter using Drizzle ORM.
 * Implements the AuditStorage interface from audit-core.
 * The service account should only have INSERT grant on audit_log.
 */
@Injectable()
export class DrizzleAuditStorage implements AuditStorage {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async appendAtomic(
    build: (latest: AuditEntry | null, nextSequence: bigint) => AuditEntry,
  ): Promise<AuditEntry> {
    return this.db.transaction(async (tx) => {
      // Serialize concurrent appends on the chain. Arbitrary lock key
      // tied to the audit_log table; released at transaction end.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('audit_log'))`);

      const [latestRow] = await tx
        .select()
        .from(auditLog)
        .orderBy(desc(auditLog.sequence))
        .limit(1);
      const latest = latestRow ? this.toAuditEntry(latestRow) : null;

      const seqResult = await tx.execute<{ seq: string }>(
        sql`SELECT nextval('audit_log_sequence_seq') AS seq`,
      );
      const nextSequence = BigInt(seqResult.rows[0]!.seq);

      const entry = build(latest, nextSequence);

      const [row] = await tx
        .insert(auditLog)
        .values({
          sequence: entry.sequence,
          timestamp: new Date(entry.timestamp),
          actorId: entry.actorId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          requestHash: entry.requestHash,
          prevHash: entry.prevHash,
          entryHash: entry.entryHash,
          signature: entry.signature,
        })
        .returning();

      return this.toAuditEntry(row!);
    });
  }

  async getRange(from?: bigint, to?: bigint): Promise<AuditEntry[]> {
    const conditions = [];
    if (from !== undefined) conditions.push(gte(auditLog.sequence, from));
    if (to !== undefined) conditions.push(lte(auditLog.sequence, to));

    const rows = await this.db
      .select()
      .from(auditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(auditLog.sequence);

    return rows.map((row) => this.toAuditEntry(row));
  }

  async getLatest(): Promise<AuditEntry | null> {
    const [row] = await this.db.select().from(auditLog).orderBy(desc(auditLog.sequence)).limit(1);

    return row ? this.toAuditEntry(row) : null;
  }

  private toAuditEntry(row: typeof auditLog.$inferSelect): AuditEntry {
    return {
      sequence: BigInt(row.sequence),
      timestamp: row.timestamp.getTime(),
      actorId: row.actorId,
      action: row.action,
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      requestHash: row.requestHash,
      prevHash: row.prevHash,
      entryHash: row.entryHash,
      signature: row.signature,
    };
  }
}
