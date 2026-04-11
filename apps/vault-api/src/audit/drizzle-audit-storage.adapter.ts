import { Inject, Injectable } from '@nestjs/common';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
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

  async append(entry: Omit<AuditEntry, 'sequence'>): Promise<AuditEntry> {
    const [row] = await this.db
      .insert(auditLog)
      .values({
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
