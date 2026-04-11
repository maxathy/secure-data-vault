/**
 * Context bound to every encrypt/decrypt operation via AES-256-GCM
 * Associated Authenticated Data (AAD). Prevents ciphertext from being
 * transplanted between records or tenants.
 */
export interface CryptoContext {
  recordId: string;
  tenantId: string;
}

/**
 * The encrypted envelope stored in the database. Contains everything
 * needed to decrypt the payload given the correct keyset and AAD context.
 */
export interface EncryptedEnvelope {
  /** Base64-encoded ciphertext (IV || encrypted || authTag). */
  ciphertext: string;
  /** Base64-encoded wrapped DEK (IV || encrypted DEK || authTag). */
  encryptedDataKey: string;
  /** Key version identifier for rotation tracking. */
  keyVersion: string;
  /** Numeric key ID within the keyset that encrypted this record. */
  keyId: number;
  /** Algorithm identifier — always AES-256-GCM in this implementation. */
  algorithm: 'AES-256-GCM';
}

/** Status of a key within a keyset. */
export type KeyStatus = 'ENABLED' | 'DISABLED';

/** A single key entry within a keyset. */
export interface KeyEntry {
  keyId: number;
  status: KeyStatus;
  keyType: string;
  version: string;
  /** Raw key material — 32 bytes (256 bits) for AES-256-GCM. */
  keyMaterial: Buffer;
}

/**
 * A keyset containing one or more encryption keys, with exactly one
 * designated as the primary key for new encryptions.
 */
export interface KeysetHandle {
  primaryKeyId: number;
  keys: KeyEntry[];
}

/** Serialized keyset format for storage in JSON files. */
export interface SerializedKeyset {
  primaryKeyId: number;
  keys: Array<{
    keyId: number;
    status: KeyStatus;
    keyType: string;
    version: string;
    /** Base64-encoded key material. */
    keyMaterial: string;
  }>;
}
