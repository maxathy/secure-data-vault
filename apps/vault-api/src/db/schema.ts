import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  integer,
  bigserial,
  text,
} from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  email: varchar('email', { length: 320 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const records = pgTable('records', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  encryptedPayload: jsonb('encrypted_payload').notNull(),
  keyVersion: varchar('key_version', { length: 50 }).notNull(),
  keyId: integer('key_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  version: integer('version').notNull().default(1),
});

/**
 * Append-only audit log. The application service account must have
 * INSERT-only grants — no UPDATE or DELETE.
 */
export const auditLog = pgTable('audit_log', {
  sequence: bigserial('sequence', { mode: 'bigint' }).primaryKey(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  actorId: uuid('actor_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: uuid('resource_id'),
  requestHash: varchar('request_hash', { length: 64 }).notNull(),
  prevHash: varchar('prev_hash', { length: 64 }).notNull(),
  entryHash: varchar('entry_hash', { length: 64 }).notNull(),
  signature: text('signature').notNull(),
});
