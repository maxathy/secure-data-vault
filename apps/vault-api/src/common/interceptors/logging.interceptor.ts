import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';
import { safeLog } from '../safe-log/safe-log';
import { getRequestId } from '../correlation/correlation.middleware';

/**
 * Global interceptor that logs every request and response with
 * structured metadata. All loggable data passes through safeLog()
 * to redact PII before emission.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body } = request;
    const startTime = Date.now();

    this.logger.log(
      JSON.stringify({
        event: 'request',
        method,
        url,
        requestId: getRequestId(),
        body: safeLog(body),
      }),
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          const duration = Date.now() - startTime;
          this.logger.log(
            JSON.stringify({
              event: 'response',
              method,
              url,
              statusCode: response.statusCode,
              duration: `${duration}ms`,
              requestId: getRequestId(),
            }),
          );
        },
        error: (err: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            JSON.stringify({
              event: 'error',
              method,
              url,
              error: err.message,
              duration: `${duration}ms`,
              requestId: getRequestId(),
            }),
          );
        },
      }),
    );
  }
}
