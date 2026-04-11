import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../db/drizzle.provider';
import { users } from '../db/schema';
import type { CreateUserDto, UserResponse } from '@secure-data-vault/shared-types';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const [row] = await this.db
      .insert(users)
      .values({
        tenantId: dto.tenantId,
        email: dto.email,
        role: dto.role ?? 'member',
      })
      .returning();

    return this.toResponse(row!);
  }

  async findAll(): Promise<UserResponse[]> {
    const rows = await this.db.select().from(users).orderBy(users.createdAt);
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string): Promise<UserResponse> {
    const [row] = await this.db.select().from(users).where(eq(users.id, id));

    if (!row) {
      throw new NotFoundException({
        type: 'https://vault.example.com/problems/not-found',
        title: 'Not Found',
        status: 404,
        detail: `User ${id} not found.`,
      });
    }

    return this.toResponse(row);
  }

  private toResponse(row: typeof users.$inferSelect): UserResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
