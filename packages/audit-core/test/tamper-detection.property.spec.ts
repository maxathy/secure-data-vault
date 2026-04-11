import { randomBytes } from 'node:crypto';
import fc from 'fast-check';
import { AuditLog, InMemoryAuditStorage, verifyChain } from '../src';
import type { AuditEntry, AuditEntryInput } from '../src';

const macKey = randomBytes(32);

function makeInput(seed: number): AuditEntryInput {
  return {
    timestamp: 1700000000000 + seed * 1000,
    actorId: `actor-${seed}`,
    action: `test:action-${seed % 5}`,
    resourceType: 'record',
    resourceId: `resource-${seed}`,
    requestHash: 'c'.repeat(64),
  };
}

async function buildValidChain(length: number): Promise<{
  entries: AuditEntry[];
  storage: InMemoryAuditStorage;
}> {
  const storage = new InMemoryAuditStorage();
  const log = new AuditLog(storage, macKey);
  for (let i = 0; i < length; i++) {
    await log.append(makeInput(i));
  }
  return { entries: storage.getEntries(), storage };
}

// Tamper-able fields on an audit entry (excluding sequence, as that
// would break the test indexing, and is separately tested)
const TAMPER_FIELDS = [
  'timestamp',
  'actorId',
  'action',
  'resourceType',
  'resourceId',
  'requestHash',
  'prevHash',
  'entryHash',
  'signature',
] as const;

describe('audit-core: property-based tamper detection', () => {
  it('detects any single-field mutation at any position in the chain', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 3, max: 15 }), // chain length
        fc.integer({ min: 0, max: 999 }), // tamper position seed
        fc.integer({ min: 0, max: TAMPER_FIELDS.length - 1 }), // field index
        async (chainLength, tamperSeed, fieldIndex) => {
          const { entries } = await buildValidChain(chainLength);
          const tamperIndex = tamperSeed % chainLength;
          const field = TAMPER_FIELDS[fieldIndex]!;

          // Deep clone entries to avoid cross-test contamination
          const tampered = entries.map((e) => ({ ...e }));

          // Apply the mutation
          switch (field) {
            case 'timestamp':
              tampered[tamperIndex]!.timestamp = 0;
              break;
            case 'actorId':
              tampered[tamperIndex]!.actorId = 'tampered-actor';
              break;
            case 'action':
              tampered[tamperIndex]!.action = 'tampered:action';
              break;
            case 'resourceType':
              tampered[tamperIndex]!.resourceType = 'tampered-type';
              break;
            case 'resourceId':
              tampered[tamperIndex]!.resourceId = 'tampered-resource';
              break;
            case 'requestHash':
              tampered[tamperIndex]!.requestHash = 'f'.repeat(64);
              break;
            case 'prevHash':
              tampered[tamperIndex]!.prevHash = 'e'.repeat(64);
              break;
            case 'entryHash':
              tampered[tamperIndex]!.entryHash = 'd'.repeat(64);
              break;
            case 'signature':
              tampered[tamperIndex]!.signature = 'dGFtcGVyZWQ='; // base64 "tampered"
              break;
          }

          const result = verifyChain(tampered, macKey);

          // The chain must not be reported as 'full'
          expect(result.status).not.toBe('full');

          // The divergent sequence should be at or before the tampered entry
          // (because tampering an entry can break verification at that entry
          // or at the next entry that references it via prevHash)
          if (result.firstDivergentSequence !== null) {
            expect(result.firstDivergentSequence).toBeLessThanOrEqual(
              Number(tampered[tamperIndex]!.sequence) + 1,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
