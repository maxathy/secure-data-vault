import { encrypt, decrypt, loadEncryptionKeyset, AadMismatchError } from '../src';
import type { CryptoContext } from '../src';

describe('crypto-core: AAD binding', () => {
  const keyset = loadEncryptionKeyset('dev');
  const context: CryptoContext = {
    recordId: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: '660e8400-e29b-41d4-a716-446655440000',
  };

  it('rejects decryption with wrong tenantId', async () => {
    const envelope = await encrypt('secret data', context, keyset);

    const wrongContext: CryptoContext = {
      ...context,
      tenantId: '770e8400-e29b-41d4-a716-446655440000',
    };

    await expect(decrypt(envelope, wrongContext, keyset)).rejects.toThrow(AadMismatchError);
  });

  it('rejects decryption with wrong recordId', async () => {
    const envelope = await encrypt('secret data', context, keyset);

    const wrongContext: CryptoContext = {
      ...context,
      recordId: '880e8400-e29b-41d4-a716-446655440000',
    };

    await expect(decrypt(envelope, wrongContext, keyset)).rejects.toThrow(AadMismatchError);
  });

  it('rejects decryption with both IDs swapped', async () => {
    const envelope = await encrypt('secret data', context, keyset);

    const swappedContext: CryptoContext = {
      recordId: context.tenantId,
      tenantId: context.recordId,
    };

    await expect(decrypt(envelope, swappedContext, keyset)).rejects.toThrow(AadMismatchError);
  });

  it('produces a descriptive error message on AAD mismatch', async () => {
    const envelope = await encrypt('secret data', context, keyset);

    const wrongContext: CryptoContext = { ...context, tenantId: 'wrong-tenant' };

    try {
      await decrypt(envelope, wrongContext, keyset);
      fail('Expected AadMismatchError');
    } catch (err) {
      expect(err).toBeInstanceOf(AadMismatchError);
      expect((err as AadMismatchError).message).toContain('AAD mismatch');
    }
  });
});
