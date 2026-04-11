import { z } from 'zod';

export const CreateTenantSchema = z.object({
  name: z.string().min(1).max(255),
});
export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;

export const TenantResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  createdAt: z.string().datetime(),
});
export type TenantResponse = z.infer<typeof TenantResponseSchema>;
