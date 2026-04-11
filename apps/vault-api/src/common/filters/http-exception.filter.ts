import {
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
  ExceptionFilter,
} from '@nestjs/common';
import { Response, Request } from 'express';
import type { Rfc7807Error } from '@secure-data-vault/shared-types';

const STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

const STATUS_TYPES: Record<number, string> = {
  400: 'bad-request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not-found',
  409: 'conflict',
  422: 'validation-error',
  429: 'rate-limited',
  500: 'internal-error',
};

/**
 * Global exception filter that ensures every error response conforms
 * to RFC 7807 Problem Details (application/problem+json).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : 500;

    // If the exception already carries an RFC 7807 body (e.g., from
    // ZodValidationException), forward it directly.
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'type' in exceptionResponse &&
        'title' in exceptionResponse
      ) {
        response
          .status(status)
          .header('Content-Type', 'application/problem+json')
          .json(exceptionResponse);
        return;
      }
    }

    // For unexpected errors, log the full stack trace
    if (status >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: Rfc7807Error = {
      type: `https://vault.example.com/problems/${STATUS_TYPES[status] ?? 'unknown'}`,
      title: STATUS_TITLES[status] ?? 'Error',
      status,
      detail: this.extractDetail(exception),
    };

    response
      .status(status)
      .header('Content-Type', 'application/problem+json')
      .json(body);
  }

  private extractDetail(exception: unknown): string {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') return res;
      if (typeof res === 'object' && res !== null && 'message' in res) {
        const msg = (res as { message: unknown }).message;
        return Array.isArray(msg) ? msg.join('; ') : String(msg);
      }
    }
    // Never leak internal error details to clients
    return 'An unexpected error occurred.';
  }
}
