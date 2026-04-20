import { z } from 'zod';

export const CreateRecordSchema = z.object({
  tenantId: z.string().uuid(),
  ownerId: z.string().uuid(),
  payload: z.record(z.unknown()),
});
export type CreateRecordDto = z.infer<typeof CreateRecordSchema>;

export const UpdateRecordSchema = z.object({
  tenantId: z.string().uuid(),
  payload: z.record(z.unknown()),
  version: z.number().int().positive(),
});
export type UpdateRecordDto = z.infer<typeof UpdateRecordSchema>;

export const DeleteRecordSchema = z.object({
  tenantId: z.string().uuid(),
});
export type DeleteRecordDto = z.infer<typeof DeleteRecordSchema>;

/** Shape of the encrypted_payload JSONB column stored in Postgres. */
export const EncryptedEnvelopeSchema = z.object({
  ciphertext: z.string(),
  encryptedDataKey: z.string(),
  keyVersion: z.string(),
  keyId: z.number().int(),
  algorithm: z.literal('AES-256-GCM'),
});
export type EncryptedEnvelope = z.infer<typeof EncryptedEnvelopeSchema>;

export const RecordResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  ownerId: z.string().uuid(),
  payload: z.record(z.unknown()),
  version: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type RecordResponse = z.infer<typeof RecordResponseSchema>;
