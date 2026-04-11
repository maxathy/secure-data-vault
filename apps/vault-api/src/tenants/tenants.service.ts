import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../db/drizzle.provider';
import { tenants } from '../db/schema';
import type { CreateTenantDto, TenantResponse } from '@secure-data-vault/shared-types';

@Injectable()
export class TenantsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(dto: CreateTenantDto): Promise<TenantResponse> {
    const [row] = await this.db.insert(tenants).values({ name: dto.name }).returning();

    return this.toResponse(row!);
  }

  async findAll(): Promise<TenantResponse[]> {
    const rows = await this.db.select().from(tenants).orderBy(tenants.createdAt);
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string): Promise<TenantResponse> {
    const [row] = await this.db.select().from(tenants).where(eq(tenants.id, id));

    if (!row) {
      throw new NotFoundException({
        type: 'https://vault.example.com/problems/not-found',
        title: 'Not Found',
        status: 404,
        detail: `Tenant ${id} not found.`,
      });
    }

    return this.toResponse(row);
  }

  private toResponse(row: typeof tenants.$inferSelect): TenantResponse {
    return {
      id: row.id,
      name: row.name,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
