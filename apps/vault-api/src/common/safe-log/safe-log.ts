/** Key patterns that may contain PII or sensitive data. Case-insensitive. */
const PII_KEY_PATTERNS = [
  /email/i,
  /phone/i,
  /ssn/i,
  /dob/i,
  /address/i,
  /payload/i,
  /password/i,
  /secret/i,
  /token/i,
  /authorization/i,
];

const REDACTED = '[REDACTED]';

/**
 * Deep-clone an object and replace any value at a key matching a PII
 * pattern with '[REDACTED]'. Prevents sensitive data from appearing
 * in structured logs.
 *
 * - Handles nested objects and arrays recursively.
 * - Returns primitives unchanged.
 * - Does NOT mutate the input.
 */
export function safeLog(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => safeLog(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (PII_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      result[key] = REDACTED;
    } else if (typeof value === 'object' && value !== null) {
      result[key] = safeLog(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
