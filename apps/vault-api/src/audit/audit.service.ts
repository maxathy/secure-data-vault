import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  AuditLog,
  verifyChain,
  type AuditEntryInput,
  type AuditEntry,
  type VerifyChainResult,
} from '@secure-data-vault/audit-core';
import { loadMacKeyset } from '@secure-data-vault/crypto-core';
import { DrizzleAuditStorage } from './drizzle-audit-storage.adapter';

/**
 * NestJS service wrapping audit-core.
 * Manages the MAC keyset and delegates to the AuditLog/storage.
 */
@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);
  private macKey!: Buffer;
  private auditLog!: AuditLog;

  constructor(private readonly storage: DrizzleAuditStorage) {}

  onModuleInit() {
    this.macKey = loadMacKeyset();
    this.auditLog = new AuditLog(this.storage, this.macKey);
    this.logger.log('Audit MAC keyset loaded');
  }

  async append(input: AuditEntryInput): Promise<AuditEntry> {
    return this.auditLog.append(input);
  }

  async verify(from?: number, to?: number): Promise<VerifyChainResult> {
    const entries = await this.storage.getRange(
      from !== undefined ? BigInt(from) : undefined,
      to !== undefined ? BigInt(to) : undefined,
    );
    return verifyChain(entries, this.macKey);
  }

  async getEntries(from?: number, to?: number): Promise<AuditEntry[]> {
    return this.storage.getRange(
      from !== undefined ? BigInt(from) : undefined,
      to !== undefined ? BigInt(to) : undefined,
    );
  }
}
