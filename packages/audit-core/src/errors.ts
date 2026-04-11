/** Thrown when the audit chain hash linkage is broken. */
export class ChainIntegrityError extends Error {
  constructor(
    public readonly divergentSequence: bigint,
    message?: string,
  ) {
    super(message ?? `Audit chain integrity violation at sequence ${divergentSequence}`);
    this.name = 'ChainIntegrityError';
  }
}

/** Thrown when an HMAC signature does not match the expected value. */
export class SignatureVerificationError extends Error {
  constructor(
    public readonly divergentSequence: bigint,
    message?: string,
  ) {
    super(message ?? `Signature verification failed at sequence ${divergentSequence}`);
    this.name = 'SignatureVerificationError';
  }
}
