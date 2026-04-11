import { createCipheriv, randomBytes } from 'node:crypto';
import type { CryptoContext, EncryptedEnvelope, KeysetHandle } from './types.js';
import { getPrimaryKey } from './keyset.js';

const ALGORITHM = 'aes-256-gcm' as const;
const IV_LENGTH = 12; // 96 bits — NIST recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const DEK_LENGTH = 32; // 256 bits

/**
 * Encrypt plaintext using AES-256-GCM envelope encryption.
 *
 * 1. A fresh random Data Encryption Key (DEK) is generated for each call.
 * 2. The plaintext is encrypted with the DEK using AES-256-GCM.
 * 3. The DEK is wrapped (encrypted) with the primary Key Encryption Key (KEK)
 *    from the keyset.
 * 4. `recordId:tenantId` is bound as Associated Authenticated Data (AAD),
 *    preventing ciphertext transplant between records or tenants.
 *
 * The plaintext DEK is never persisted — only the wrapped form is stored.
 */
export async function encrypt(
  plaintext: string,
  context: CryptoContext,
  keyset: KeysetHandle,
): Promise<EncryptedEnvelope> {
  const aad = buildAad(context);
  const primaryKey = getPrimaryKey(keyset);

  // Generate a random DEK for this record
  const dek = randomBytes(DEK_LENGTH);

  // Encrypt plaintext with DEK + AAD
  const dataIv = randomBytes(IV_LENGTH);
  const dataCipher = createCipheriv(ALGORITHM, dek, dataIv, { authTagLength: AUTH_TAG_LENGTH });
  dataCipher.setAAD(aad);
  const encrypted = Buffer.concat([dataCipher.update(plaintext, 'utf8'), dataCipher.final()]);
  const dataTag = dataCipher.getAuthTag();

  // Pack as: IV || ciphertext || authTag
  const ciphertext = Buffer.concat([dataIv, encrypted, dataTag]);

  // Wrap the DEK with the KEK (primary key from keyset)
  const kekIv = randomBytes(IV_LENGTH);
  const kekCipher = createCipheriv(ALGORITHM, primaryKey.keyMaterial, kekIv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const wrappedDek = Buffer.concat([kekCipher.update(dek), kekCipher.final()]);
  const kekTag = kekCipher.getAuthTag();

  // Pack wrapped DEK as: IV || wrappedDEK || authTag
  const encryptedDataKey = Buffer.concat([kekIv, wrappedDek, kekTag]);

  // Zero out the plaintext DEK from memory
  dek.fill(0);

  return {
    ciphertext: ciphertext.toString('base64'),
    encryptedDataKey: encryptedDataKey.toString('base64'),
    keyVersion: primaryKey.version,
    keyId: primaryKey.keyId,
    algorithm: 'AES-256-GCM',
  };
}

function buildAad(context: CryptoContext): Buffer {
  return Buffer.from(`${context.recordId}:${context.tenantId}`, 'utf8');
}
