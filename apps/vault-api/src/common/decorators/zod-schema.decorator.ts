import { SetMetadata } from '@nestjs/common';
import { ZodSchema } from 'zod';

export const ZOD_BODY_SCHEMA = 'zod:body:schema';
export const ZOD_QUERY_SCHEMA = 'zod:query:schema';
export const ZOD_PARAM_SCHEMA = 'zod:param:schema';
export const ZOD_RESPONSE_SCHEMA = 'zod:response:schema';

/**
 * Marks a controller method parameter to be validated against a Zod schema.
 * Works in concert with ZodValidationPipe, which reads this metadata.
 *
 * Usage:
 *   @Post()
 *   create(@ZodBody(CreateRecordSchema) dto: CreateRecordDto) { ... }
 */
export const ZodBody = (schema: ZodSchema) => SetMetadata(ZOD_BODY_SCHEMA, schema);
export const ZodQuery = (schema: ZodSchema) => SetMetadata(ZOD_QUERY_SCHEMA, schema);
export const ZodParam = (schema: ZodSchema) => SetMetadata(ZOD_PARAM_SCHEMA, schema);

/** Marks the response schema for outbound validation. */
export const ZodResponse = (schema: ZodSchema) => SetMetadata(ZOD_RESPONSE_SCHEMA, schema);
