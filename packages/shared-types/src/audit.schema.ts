import { z } from 'zod';

export const AuditEntrySchema = z.object({
  sequence: z.string(), // bigint comes as string from Postgres
  timestamp: z.string().datetime(),
  actorId: z.string().uuid(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().uuid().nullable(),
  requestHash: z.string().length(64),
  prevHash: z.string().length(64),
  entryHash: z.string().length(64),
  signature: z.string(),
});
export type AuditEntryResponse = z.infer<typeof AuditEntrySchema>;

export const AuditQuerySchema = z.object({
  from: z.coerce.number().int().positive().optional(),
  to: z.coerce.number().int().positive().optional(),
});
export type AuditQueryDto = z.infer<typeof AuditQuerySchema>;

export const VerifyChainResponseSchema = z.object({
  status: z.enum(['full', 'partial', 'failed']),
  checkedRows: z.number().int().nonnegative(),
  firstDivergentSequence: z.number().int().positive().nullable(),
});
export type VerifyChainResponse = z.infer<typeof VerifyChainResponseSchema>;
