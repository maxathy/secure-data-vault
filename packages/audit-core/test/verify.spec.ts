import { randomBytes } from 'node:crypto';
import { AuditLog, InMemoryAuditStorage, verifyChain } from '../src';
import type { AuditEntryInput } from '../src';

const macKey = randomBytes(32);

function makeInput(i: number = 0): AuditEntryInput {
  return {
    timestamp: Date.now() + i,
    actorId: `user-${i}`,
    action: 'records:create',
    resourceType: 'record',
    resourceId: `res-${i}`,
    requestHash: 'b'.repeat(64),
  };
}

async function buildChain(length: number) {
  const storage = new InMemoryAuditStorage();
  const log = new AuditLog(storage, macKey);
  for (let i = 0; i < length; i++) {
    await log.append(makeInput(i));
  }
  return storage;
}

describe('audit-core: tamper detection', () => {
  it('detects a modified entryHash', async () => {
    const storage = await buildChain(5);
    const entries = storage.getEntries();

    entries[2]!.entryHash = 'deadbeef'.repeat(8);

    const result = verifyChain(entries, macKey);
    expect(result.status).toBe('partial');
    expect(result.firstDivergentSequence).toBe(3);
  });

  it('detects a modified prevHash', async () => {
    const storage = await buildChain(5);
    const entries = storage.getEntries();

    entries[3]!.prevHash = '0'.repeat(64);

    const result = verifyChain(entries, macKey);
    expect(result.status).toBe('partial');
    expect(result.firstDivergentSequence).toBe(4);
  });

  it('detects a modified action field', async () => {
    const storage = await buildChain(5);
    const entries = storage.getEntries();

    entries[1]!.action = 'records:delete';

    const result = verifyChain(entries, macKey);
    expect(result.status).toBe('partial');
    expect(result.firstDivergentSequence).toBe(2);
  });

  it('detects a modified actorId field', async () => {
    const storage = await buildChain(5);
    const entries = storage.getEntries();

    entries[0]!.actorId = 'attacker';

    const result = verifyChain(entries, macKey);
    expect(result.status).toBe('failed');
    expect(result.firstDivergentSequence).toBe(1);
  });

  it('detects a deleted row (gap in sequence)', async () => {
    const storage = await buildChain(5);
    const entries = storage.getEntries();

    // Remove the third entry (index 2)
    entries.splice(2, 1);

    const result = verifyChain(entries, macKey);
    expect(result.status).toBe('partial');
    // The break is detected at the entry that follows the gap
    expect(result.firstDivergentSequence).toBe(4);
  });

  it('detects an inserted row', async () => {
    const storage = await buildChain(5);
    const entries = storage.getEntries();

    // Insert a fake entry at position 2
    const fakeEntry = { ...entries[2]!, sequence: 99n, entryHash: 'fake'.repeat(16) };
    entries.splice(2, 0, fakeEntry);

    const result = verifyChain(entries, macKey);
    expect(result.status).toBe('partial');
  });

  it('detects signature forgery with a different MAC key', async () => {
    const storage = await buildChain(3);
    const entries = storage.getEntries();

    // Verify with the wrong key
    const wrongKey = randomBytes(32);
    const result = verifyChain(entries, wrongKey);

    expect(result.status).toBe('failed');
    expect(result.firstDivergentSequence).toBe(1);
  });

  it('detects a modified timestamp', async () => {
    const storage = await buildChain(3);
    const entries = storage.getEntries();

    entries[1]!.timestamp = 0;

    const result = verifyChain(entries, macKey);
    expect(result.status).toBe('partial');
    expect(result.firstDivergentSequence).toBe(2);
  });
});
