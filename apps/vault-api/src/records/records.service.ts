import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../db/drizzle.provider';
import { records } from '../db/schema';
import { CryptoService } from '../crypto/crypto.service';
import type {
  CreateRecordDto,
  UpdateRecordDto,
  RecordResponse,
} from '@secure-data-vault/shared-types';
import type { EncryptedEnvelope } from '@secure-data-vault/crypto-core';

@Injectable()
export class RecordsService {
  private readonly logger = new Logger(RecordsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDB,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(dto: CreateRecordDto): Promise<RecordResponse> {
    // Encrypt the payload at the application layer
    const plaintext = JSON.stringify(dto.payload);

    // We need a record ID for AAD binding. Generate it first, then encrypt.
    const id = crypto.randomUUID();

    const envelope = await this.cryptoService.encrypt(plaintext, {
      recordId: id,
      tenantId: dto.tenantId,
    });

    const [row] = await this.db
      .insert(records)
      .values({
        id,
        tenantId: dto.tenantId,
        ownerId: dto.ownerId,
        encryptedPayload: envelope,
        keyVersion: envelope.keyVersion,
        keyId: envelope.keyId,
      })
      .returning();

    return this.toResponse(row!, dto.payload);
  }

  async findOne(id: string): Promise<RecordResponse> {
    const [row] = await this.db
      .select()
      .from(records)
      .where(eq(records.id, id));

    if (!row) {
      throw new NotFoundException({
        type: 'https://vault.example.com/problems/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Record ${id} not found.`,
      });
    }

    // Decrypt the payload
    const envelope = row.encryptedPayload as unknown as EncryptedEnvelope;
    const plaintext = await this.cryptoService.decrypt(envelope, {
      recordId: row.id,
      tenantId: row.tenantId,
    });

    const payload = JSON.parse(plaintext) as Record<string, unknown>;
    return this.toResponse(row, payload);
  }

  async update(
    id: string,
    dto: UpdateRecordDto,
    tenantId: string,
  ): Promise<RecordResponse> {
    // Re-encrypt the updated payload
    const plaintext = JSON.stringify(dto.payload);
    const envelope = await this.cryptoService.encrypt(plaintext, {
      recordId: id,
      tenantId,
    });

    const result = await this.db
      .update(records)
      .set({
        encryptedPayload: envelope,
        keyVersion: envelope.keyVersion,
        keyId: envelope.keyId,
        version: sql`${records.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(records.id, id),
          eq(records.tenantId, tenantId),
          eq(records.version, dto.version), // Optimistic concurrency check
        ),
      )
      .returning();

    if (result.length === 0) {
      // Could be not-found OR version mismatch. Check which.
      const [existing] = await this.db
        .select()
        .from(records)
        .where(and(eq(records.id, id), eq(records.tenantId, tenantId)));

      if (!existing) {
        throw new NotFoundException({
          type: 'https://vault.example.com/problems/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Record ${id} not found.`,
        });
      }

      throw new ConflictException({
        type: 'https://vault.example.com/problems/version-conflict',
        title: 'Version Conflict',
        status: 409,
        detail: `Record ${id} has been modified (current version: ${existing.version}). Refetch and retry.`,
      });
    }

    return this.toResponse(result[0]!, dto.payload);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const result = await this.db
      .delete(records)
      .where(and(eq(records.id, id), eq(records.tenantId, tenantId)))
      .returning({ id: records.id });

    if (result.length === 0) {
      throw new NotFoundException({
        type: 'https://vault.example.com/problems/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Record ${id} not found.`,
      });
    }
  }

  private toResponse(
    row: typeof records.$inferSelect,
    payload: Record<string, unknown>,
  ): RecordResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      ownerId: row.ownerId,
      payload,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
