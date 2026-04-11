import type { KeyEntry, KeysetHandle, SerializedKeyset } from './types.js';
import { MissingKeyVersionError } from './errors.js';

/**
 * Deserialize a JSON keyset into an in-memory KeysetHandle with
 * decoded key material buffers.
 */
export function deserializeKeyset(raw: SerializedKeyset): KeysetHandle {
  const keys: KeyEntry[] = raw.keys.map((k) => ({
    keyId: k.keyId,
    status: k.status,
    keyType: k.keyType,
    version: k.version,
    keyMaterial: Buffer.from(k.keyMaterial, 'base64'),
  }));

  // Validate primary key exists and is enabled
  const primary = keys.find((k) => k.keyId === raw.primaryKeyId);
  if (!primary) {
    throw new Error(`Primary key ID ${raw.primaryKeyId} not found in keyset`);
  }
  if (primary.status !== 'ENABLED') {
    throw new Error(`Primary key ID ${raw.primaryKeyId} is not ENABLED`);
  }

  // Validate all key material is exactly 32 bytes (256 bits)
  for (const key of keys) {
    if (key.keyMaterial.length !== 32) {
      throw new Error(
        `Key ID ${key.keyId} has ${key.keyMaterial.length * 8}-bit material, expected 256-bit`,
      );
    }
  }

  return { primaryKeyId: raw.primaryKeyId, keys };
}

/** Look up the primary key used for new encryptions. */
export function getPrimaryKey(keyset: KeysetHandle): KeyEntry {
  const key = keyset.keys.find((k) => k.keyId === keyset.primaryKeyId && k.status === 'ENABLED');
  if (!key) {
    throw new Error('No enabled primary key in keyset');
  }
  return key;
}

/** Look up a key by its numeric ID for decryption. */
export function getKeyById(keyset: KeysetHandle, keyId: number): KeyEntry {
  const key = keyset.keys.find((k) => k.keyId === keyId && k.status === 'ENABLED');
  if (!key) {
    throw new MissingKeyVersionError(keyId);
  }
  return key;
}
