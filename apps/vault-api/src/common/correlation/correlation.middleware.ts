import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export interface CorrelationContext {
  requestId: string;
}

/** AsyncLocalStorage instance for propagating correlation IDs. */
export const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

/** Retrieve the current request's correlation ID, or undefined if outside a request. */
export function getRequestId(): string | undefined {
  return correlationStorage.getStore()?.requestId;
}

/**
 * Middleware that reads X-Request-ID from the incoming request (or
 * generates a UUIDv4 if absent) and stores it in AsyncLocalStorage.
 * All downstream code (logging, audit entries) can access the ID
 * without parameter threading.
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string | undefined) ?? randomUUID();

    // Echo the ID back in the response
    res.setHeader('X-Request-ID', requestId);

    correlationStorage.run({ requestId }, () => {
      next();
    });
  }
}
