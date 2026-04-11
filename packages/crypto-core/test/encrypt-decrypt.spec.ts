import { encrypt, decrypt, loadEncryptionKeyset, resetDevWarning } from '../src';
import type { CryptoContext } from '../src';

describe('crypto-core: encrypt / decrypt round-trip', () => {
  const keyset = loadEncryptionKeyset('dev');
  const context: CryptoContext = {
    recordId: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: '660e8400-e29b-41d4-a716-446655440000',
  };

  beforeAll(() => {
    resetDevWarning();
  });

  it('round-trips plaintext through encrypt and decrypt', async () => {
    const plaintext = JSON.stringify({ notes: 'Sensitive information here', score: 42 });

    const envelope = await encrypt(plaintext, context, keyset);
    const recovered = await decrypt(envelope, context, keyset);

    expect(recovered).toBe(plaintext);
  });

  it('produces ciphertext that differs from plaintext', async () => {
    const plaintext = 'this should not appear in the envelope';

    const envelope = await encrypt(plaintext, context, keyset);

    expect(envelope.ciphertext).not.toContain(plaintext);
    expect(Buffer.from(envelope.ciphertext, 'base64').toString('utf8')).not.toContain(plaintext);
  });

  it('generates unique ciphertext for identical plaintext (random IV + DEK)', async () => {
    const plaintext = 'duplicate encryption test';

    const envelope1 = await encrypt(plaintext, context, keyset);
    const envelope2 = await encrypt(plaintext, context, keyset);

    expect(envelope1.ciphertext).not.toBe(envelope2.ciphertext);
    expect(envelope1.encryptedDataKey).not.toBe(envelope2.encryptedDataKey);
  });

  it('sets the correct algorithm and key metadata', async () => {
    const envelope = await encrypt('test', context, keyset);

    expect(envelope.algorithm).toBe('AES-256-GCM');
    expect(envelope.keyId).toBe(keyset.primaryKeyId);
    expect(envelope.keyVersion).toBe('1');
  });

  it('handles empty string plaintext', async () => {
    const envelope = await encrypt('', context, keyset);
    const recovered = await decrypt(envelope, context, keyset);

    expect(recovered).toBe('');
  });

  it('handles large payloads', async () => {
    const plaintext = 'x'.repeat(100_000);

    const envelope = await encrypt(plaintext, context, keyset);
    const recovered = await decrypt(envelope, context, keyset);

    expect(recovered).toBe(plaintext);
  });

  it('handles Unicode plaintext correctly', async () => {
    const plaintext = '{"name": "日本語テスト", "emoji": "🔐"}';

    const envelope = await encrypt(plaintext, context, keyset);
    const recovered = await decrypt(envelope, context, keyset);

    expect(recovered).toBe(plaintext);
  });
});
