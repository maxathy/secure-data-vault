import { safeLog } from './safe-log';

describe('safeLog', () => {
  it('redacts email fields', () => {
    const result = safeLog({ email: 'user@example.com', name: 'John' });
    expect(result).toEqual({ email: '[REDACTED]', name: 'John' });
  });

  it('redacts nested PII fields', () => {
    const result = safeLog({
      user: { email: 'test@test.com', phone: '555-1234', id: '123' },
    });
    expect(result).toEqual({
      user: { email: '[REDACTED]', phone: '[REDACTED]', id: '123' },
    });
  });

  it('redacts payload fields to prevent decrypted data in logs', () => {
    const result = safeLog({
      encryptedPayload: { ciphertext: 'abc' },
      payload: { sensitive: true },
    });
    expect(result).toEqual({
      encryptedPayload: '[REDACTED]',
      payload: '[REDACTED]',
    });
  });

  it('redacts authorization and token fields', () => {
    const result = safeLog({
      authorization: 'Bearer xyz',
      refreshToken: 'abc123',
      csrfSecret: 'def456',
    });
    expect(result).toEqual({
      authorization: '[REDACTED]',
      refreshToken: '[REDACTED]',
      csrfSecret: '[REDACTED]',
    });
  });

  it('handles arrays', () => {
    const result = safeLog([{ email: 'a@b.com' }, { name: 'test' }]);
    expect(result).toEqual([{ email: '[REDACTED]' }, { name: 'test' }]);
  });

  it('handles null and undefined', () => {
    expect(safeLog(null)).toBeNull();
    expect(safeLog(undefined)).toBeUndefined();
  });

  it('handles primitives', () => {
    expect(safeLog(42)).toBe(42);
    expect(safeLog('hello')).toBe('hello');
    expect(safeLog(true)).toBe(true);
  });

  it('does not mutate the original object', () => {
    const original = { email: 'test@test.com', id: '123' };
    safeLog(original);
    expect(original.email).toBe('test@test.com');
  });
});
