import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ZodSchema, ZodError } from 'zod';
import {
  ZOD_BODY_SCHEMA,
  ZOD_QUERY_SCHEMA,
  ZOD_PARAM_SCHEMA,
} from '../decorators/zod-schema.decorator';
import type { Rfc7807Error } from '@secure-data-vault/shared-types';

/**
 * Global interceptor that validates request body, query, and params
 * against Zod schemas specified via @ZodBody, @ZodQuery, @ZodParam
 * decorators. Replaces NestJS's built-in ValidationPipe with
 * schema-first validation.
 */
@Injectable()
export class ZodValidationInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const handler = context.getHandler();
    const request = context.switchToHttp().getRequest();

    // Validate body
    const bodySchema = this.reflector.get<ZodSchema | undefined>(ZOD_BODY_SCHEMA, handler);
    if (bodySchema) {
      request.body = this.validate(bodySchema, request.body, 'body');
    }

    // Validate query
    const querySchema = this.reflector.get<ZodSchema | undefined>(ZOD_QUERY_SCHEMA, handler);
    if (querySchema) {
      request.query = this.validate(querySchema, request.query, 'query');
    }

    // Validate params
    const paramSchema = this.reflector.get<ZodSchema | undefined>(ZOD_PARAM_SCHEMA, handler);
    if (paramSchema) {
      request.params = this.validate(paramSchema, request.params, 'params');
    }

    return next.handle();
  }

  private validate(schema: ZodSchema, data: unknown, source: string): unknown {
    const result = schema.safeParse(data);

    if (!result.success) {
      throw new ZodValidationException(result.error, source);
    }

    return result.data;
  }
}

/**
 * Custom exception that carries Zod validation errors for the
 * HttpExceptionFilter to format as RFC 7807.
 */
export class ZodValidationException extends UnprocessableEntityException {
  public readonly zodErrors: Array<{ path: (string | number)[]; message: string }>;

  constructor(zodError: ZodError, source: string) {
    const errors = zodError.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
    }));

    const body: Rfc7807Error = {
      type: 'https://vault.example.com/problems/validation-error',
      title: 'Validation Error',
      status: 422,
      detail: `Request ${source} failed schema validation.`,
      errors,
    };

    super(body);
    this.zodErrors = errors;
  }
}
