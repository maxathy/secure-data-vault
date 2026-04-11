import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Sign an entry hash using HMAC-SHA-256.
 * The MAC key is separate from the encryption keyset.
 */
export function signEntryHash(entryHash: string, macKey: Buffer): string {
  return createHmac('sha256', macKey).update(entryHash).digest('base64');
}

/**
 * Verify an HMAC-SHA-256 signature over an entry hash.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifySignature(
  entryHash: string,
  signature: string,
  macKey: Buffer,
): boolean {
  const expected = createHmac('sha256', macKey).update(entryHash).digest();
  const actual = Buffer.from(signature, 'base64');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
