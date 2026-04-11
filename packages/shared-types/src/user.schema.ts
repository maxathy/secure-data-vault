import { z } from 'zod';

export const CreateUserSchema = z.object({
  tenantId: z.string().uuid(),
  email: z.string().email().max(320),
  role: z.enum(['admin', 'member']).default('member'),
});
export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UserResponseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  role: z.string(),
  createdAt: z.string().datetime(),
});
export type UserResponse = z.infer<typeof UserResponseSchema>;
