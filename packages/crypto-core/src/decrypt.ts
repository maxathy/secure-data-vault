import { createDecipheriv } from 'node:crypto';
import type { CryptoContext, EncryptedEnvelope, KeysetHandle } from './types.js';
import { getKeyById } from './keyset.js';
import { AadMismatchError, DecryptionError } from './errors.js';

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Decrypt an encrypted envelope back to plaintext.
 *
 * 1. The Key Encryption Key (KEK) is looked up in the keyset by `keyId`.
 * 2. The wrapped DEK is unwrapped using the KEK.
 * 3. The ciphertext is decrypted using the DEK with AAD verification.
 *
 * If the AAD (`recordId:tenantId`) does not match what was used during
 * encryption, decryption will fail — detecting ciphertext transplant.
 */
export async function decrypt(
  envelope: EncryptedEnvelope,
  context: CryptoContext,
  keyset: KeysetHandle,
): Promise<string> {
  const aad = Buffer.from(`${context.recordId}:${context.tenantId}`, 'utf8');
  const kek = getKeyById(keyset, envelope.keyId);

  // Unwrap the DEK
  const encryptedDataKey = Buffer.from(envelope.encryptedDataKey, 'base64');
  const kekIv = encryptedDataKey.subarray(0, IV_LENGTH);
  const kekTag = encryptedDataKey.subarray(encryptedDataKey.length - AUTH_TAG_LENGTH);
  const wrappedDek = encryptedDataKey.subarray(
    IV_LENGTH,
    encryptedDataKey.length - AUTH_TAG_LENGTH,
  );

  let dek: Buffer;
  try {
    const kekDecipher = createDecipheriv(ALGORITHM, kek.keyMaterial, kekIv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    kekDecipher.setAuthTag(kekTag);
    dek = Buffer.concat([kekDecipher.update(wrappedDek), kekDecipher.final()]);
  } catch (err) {
    throw new DecryptionError('Failed to unwrap data encryption key', err);
  }

  // Decrypt the payload with AAD verification
  const ciphertext = Buffer.from(envelope.ciphertext, 'base64');
  const dataIv = ciphertext.subarray(0, IV_LENGTH);
  const dataTag = ciphertext.subarray(ciphertext.length - AUTH_TAG_LENGTH);
  const encryptedData = ciphertext.subarray(IV_LENGTH, ciphertext.length - AUTH_TAG_LENGTH);

  try {
    const dataDecipher = createDecipheriv(ALGORITHM, dek, dataIv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    dataDecipher.setAuthTag(dataTag);
    dataDecipher.setAAD(aad);
    const plaintext = Buffer.concat([dataDecipher.update(encryptedData), dataDecipher.final()]);

    // Zero out the DEK from memory
    dek.fill(0);

    return plaintext.toString('utf8');
  } catch (err) {
    dek.fill(0);
    // GCM authentication failure indicates AAD mismatch or data tampering.
    // Node.js crypto throws "Unsupported state or unable to authenticate data"
    // when the auth tag or AAD verification fails.
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('authenticate') || message.includes('Unsupported state')) {
      throw new AadMismatchError();
    }
    throw new DecryptionError('Failed to decrypt payload', err);
  }
}
