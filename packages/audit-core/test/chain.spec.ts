import { randomBytes } from 'node:crypto';
import { AuditLog, InMemoryAuditStorage, verifyChain } from '../src';
import type { AuditEntryInput } from '../src';

const macKey = randomBytes(32);

function makeInput(overrides: Partial<AuditEntryInput> = {}): AuditEntryInput {
  return {
    timestamp: Date.now(),
    actorId: 'user-1',
    action: 'records:create',
    resourceType: 'record',
    resourceId: 'res-1',
    requestHash: 'a'.repeat(64),
    ...overrides,
  };
}

describe('audit-core: chain append and verify', () => {
  it('appends a single entry and verifies the chain', async () => {
    const storage = new InMemoryAuditStorage();
    const log = new AuditLog(storage, macKey);

    await log.append(makeInput());

    const entries = await storage.getRange();
    const result = verifyChain(entries, macKey);

    expect(result.status).toBe('full');
    expect(result.checkedRows).toBe(1);
    expect(result.firstDivergentSequence).toBeNull();
  });

  it('appends multiple entries and maintains a valid chain', async () => {
    const storage = new InMemoryAuditStorage();
    const log = new AuditLog(storage, macKey);

    for (let i = 0; i < 10; i++) {
      await log.append(makeInput({ action: `test:action-${i}` }));
    }

    const entries = await storage.getRange();
    expect(entries).toHaveLength(10);

    const result = verifyChain(entries, macKey);
    expect(result.status).toBe('full');
    expect(result.checkedRows).toBe(10);
  });

  it('assigns monotonically increasing sequence numbers', async () => {
    const storage = new InMemoryAuditStorage();
    const log = new AuditLog(storage, macKey);

    const entry1 = await log.append(makeInput());
    const entry2 = await log.append(makeInput());
    const entry3 = await log.append(makeInput());

    expect(entry1.sequence).toBe(1n);
    expect(entry2.sequence).toBe(2n);
    expect(entry3.sequence).toBe(3n);
  });

  it('links entries via prevHash', async () => {
    const storage = new InMemoryAuditStorage();
    const log = new AuditLog(storage, macKey);

    await log.append(makeInput());
    await log.append(makeInput());

    const entries = await storage.getRange();
    // Second entry's prevHash should NOT be empty
    expect(entries[1]!.prevHash).not.toBe(entries[0]!.prevHash);
  });

  it('verifies an empty chain as valid', () => {
    const result = verifyChain([], macKey);
    expect(result.status).toBe('full');
    expect(result.checkedRows).toBe(0);
  });
});
