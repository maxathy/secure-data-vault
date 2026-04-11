import { z } from 'zod';

/** Reusable UUID v4 schema with format validation. */
export const UuidSchema = z.string().uuid();

/** Pagination query parameters shared across list endpoints. */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type PaginationDto = z.infer<typeof PaginationSchema>;

/** Paginated response wrapper. */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
  });

/**
 * RFC 7807 Problem Details for HTTP APIs.
 * Every error response from the API conforms to this shape.
 */
export const Rfc7807ErrorSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  errors: z
    .array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])),
        message: z.string(),
      }),
    )
    .optional(),
});
export type Rfc7807Error = z.infer<typeof Rfc7807ErrorSchema>;
