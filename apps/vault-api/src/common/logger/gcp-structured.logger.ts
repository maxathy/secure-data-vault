import { LoggerService, LogLevel } from '@nestjs/common';
import { getRequestId } from '../correlation/correlation.middleware';

const SEVERITY_MAP: Record<string, string> = {
  log: 'INFO',
  error: 'ERROR',
  warn: 'WARNING',
  debug: 'DEBUG',
  verbose: 'DEBUG',
};

/**
 * Structured JSON logger conforming to Google Cloud Logging format.
 * Includes correlation IDs from AsyncLocalStorage on every log line.
 *
 * On local dev, the JSON output is human-readable and can be imported
 * into Cloud Logging without adapters.
 */
export class GcpStructuredLogger implements LoggerService {
  log(message: string, context?: string) {
    this.emit('log', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.emit('error', message, context, trace);
  }

  warn(message: string, context?: string) {
    this.emit('warn', message, context);
  }

  debug(message: string, context?: string) {
    this.emit('debug', message, context);
  }

  verbose(message: string, context?: string) {
    this.emit('verbose', message, context);
  }

  setLogLevels(_levels: LogLevel[]) {
    // No-op: filtering is handled by Cloud Logging severity
  }

  private emit(level: string, message: string, context?: string, trace?: string) {
    const entry: Record<string, unknown> = {
      severity: SEVERITY_MAP[level] ?? 'DEFAULT',
      message,
      timestamp: new Date().toISOString(),
      'logging.googleapis.com/insertId': getRequestId(),
      labels: {
        service: 'vault-api',
        version: process.env['npm_package_version'] ?? '0.0.0',
      },
    };

    const requestId = getRequestId();
    if (requestId) {
      entry['requestId'] = requestId;
    }

    if (context) {
      entry['context'] = context;
    }

    if (trace) {
      entry['stack_trace'] = trace;
    }

    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(JSON.stringify(entry) + '\n');
  }
}
