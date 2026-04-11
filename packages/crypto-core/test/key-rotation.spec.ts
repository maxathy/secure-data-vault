import { randomBytes } from 'node:crypto';
import { encrypt, decrypt, deserializeKeyset, MissingKeyVersionError } from '../src';
import type { CryptoContext, SerializedKeyset } from '../src';

describe('crypto-core: key rotation', () => {
  const context: CryptoContext = {
    recordId: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: '660e8400-e29b-41d4-a716-446655440000',
  };

  function makeKeyset(primaryKeyId: number, keyCount: number): SerializedKeyset {
    return {
      primaryKeyId,
      keys: Array.from({ length: keyCount }, (_, i) => ({
        keyId: i + 1,
        status: 'ENABLED' as const,
        keyType: 'AES256_GCM',
        version: String(i + 1),
        keyMaterial: randomBytes(32).toString('base64'),
      })),
    };
  }

  it('decrypts records encrypted under a previous primary key after rotation', async () => {
    // Start with a single-key keyset
    const singleKeyRaw = makeKeyset(1, 1);
    const singleKeyset = deserializeKeyset(singleKeyRaw);

    // Encrypt a record under key v1
    const envelope = await encrypt('record from v1', context, singleKeyset);
    expect(envelope.keyId).toBe(1);

    // Rotate: add key v2 as the new primary, keeping key v1
    const rotatedRaw: SerializedKeyset = {
      primaryKeyId: 2,
      keys: [
        ...singleKeyRaw.keys,
        {
          keyId: 2,
          status: 'ENABLED',
          keyType: 'AES256_GCM',
          version: '2',
          keyMaterial: randomBytes(32).toString('base64'),
        },
      ],
    };
    const rotatedKeyset = deserializeKeyset(rotatedRaw);

    // Old record (encrypted under v1) still decrypts
    const plaintext = await decrypt(envelope, context, rotatedKeyset);
    expect(plaintext).toBe('record from v1');

    // New records are encrypted under v2
    const newEnvelope = await encrypt('record from v2', context, rotatedKeyset);
    expect(newEnvelope.keyId).toBe(2);

    const newPlaintext = await decrypt(newEnvelope, context, rotatedKeyset);
    expect(newPlaintext).toBe('record from v2');
  });

  it('fails to decrypt if the key has been removed from the keyset', async () => {
    const twoKeyRaw = makeKeyset(1, 2);
    const twoKeyset = deserializeKeyset(twoKeyRaw);

    const envelope = await encrypt('data', context, twoKeyset);

    // Remove the key that was used for encryption
    const prunedRaw: SerializedKeyset = {
      primaryKeyId: 2,
      keys: twoKeyRaw.keys.filter((k) => k.keyId !== envelope.keyId),
    };
    const prunedKeyset = deserializeKeyset(prunedRaw);

    await expect(decrypt(envelope, context, prunedKeyset)).rejects.toThrow(MissingKeyVersionError);
  });

  it('supports three-key rotation history', async () => {
    const raw = makeKeyset(1, 1);

    // Encrypt under v1
    const keyset1 = deserializeKeyset(raw);
    const env1 = await encrypt('v1 data', context, keyset1);

    // Add v2
    raw.keys.push({
      keyId: 2,
      status: 'ENABLED',
      keyType: 'AES256_GCM',
      version: '2',
      keyMaterial: randomBytes(32).toString('base64'),
    });
    raw.primaryKeyId = 2;
    const keyset2 = deserializeKeyset(raw);
    const env2 = await encrypt('v2 data', context, keyset2);

    // Add v3
    raw.keys.push({
      keyId: 3,
      status: 'ENABLED',
      keyType: 'AES256_GCM',
      version: '3',
      keyMaterial: randomBytes(32).toString('base64'),
    });
    raw.primaryKeyId = 3;
    const keyset3 = deserializeKeyset(raw);
    const env3 = await encrypt('v3 data', context, keyset3);

    // All three decrypt with the full keyset
    expect(await decrypt(env1, context, keyset3)).toBe('v1 data');
    expect(await decrypt(env2, context, keyset3)).toBe('v2 data');
    expect(await decrypt(env3, context, keyset3)).toBe('v3 data');
  });
});
