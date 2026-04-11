/**
 * Thrown when decryption fails due to mismatched Associated Authenticated
 * Data (AAD). This indicates the ciphertext was encrypted for a different
 * record/tenant combination — a potential transplant attack.
 */
export class AadMismatchError extends Error {
  constructor(message = 'AAD mismatch: ciphertext was not encrypted for this record/tenant') {
    super(message);
    this.name = 'AadMismatchError';
  }
}

/**
 * Thrown when the envelope references a key_version that cannot be
 * found in the loaded keyset.
 */
export class MissingKeyVersionError extends Error {
  constructor(keyId: number) {
    super(`Key ID ${keyId} not found in the loaded keyset`);
    this.name = 'MissingKeyVersionError';
  }
}

/**
 * Generic decryption failure when the underlying crypto operation fails
 * for reasons other than AAD mismatch or missing key version.
 */
export class DecryptionError extends Error {
  public override readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'DecryptionError';
    this.cause = cause;
  }
}
