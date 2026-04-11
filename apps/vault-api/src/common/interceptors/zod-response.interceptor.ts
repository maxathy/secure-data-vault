import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { ZodSchema } from 'zod';
import { ZOD_RESPONSE_SCHEMA } from '../decorators/zod-schema.decorator';

/**
 * Validates outbound response bodies against a Zod schema specified
 * via @ZodResponse(). Response validation failures are CRITICAL —
 * they indicate a contract violation between the service and API layer.
 * The raw validation error is never leaked to the client.
 */
@Injectable()
export class ZodResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ZodResponseInterceptor.name);

  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const schema = this.reflector.get<ZodSchema | undefined>(
      ZOD_RESPONSE_SCHEMA,
      context.getHandler(),
    );

    if (!schema) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        const result = schema.safeParse(data);
        if (!result.success) {
          this.logger.error(
            `CRITICAL: Response body failed schema validation: ${JSON.stringify(result.error.issues)}`,
          );
          throw new InternalServerErrorException({
            type: 'https://vault.example.com/problems/internal-error',
            title: 'Internal Server Error',
            status: 500,
            detail: 'An unexpected error occurred.',
          });
        }
        return result.data;
      }),
    );
  }
}
