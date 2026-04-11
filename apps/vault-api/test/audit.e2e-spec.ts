import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E tests for the audit module.
 * Requires a running Postgres instance.
 */
describe('Audit (e2e)', () => {
  let app: INestApplication;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    // Seed data
    const tenantRes = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name: 'Audit E2E Tenant' })
      .expect(201);
    tenantId = tenantRes.body.id;

    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ tenantId, email: 'audit-e2e@test.com', role: 'admin' })
      .expect(201);
    userId = userRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('audit chain passes verification after multiple mutations', async () => {
    // Create several records to generate audit entries
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/records')
        .send({
          tenantId,
          ownerId: userId,
          payload: { iteration: i },
        })
        .expect(201);
    }

    // Verify the audit chain
    const verifyRes = await request(app.getHttpServer()).get('/api/v1/audit/verify').expect(200);

    expect(verifyRes.body.status).toBe('full');
    expect(verifyRes.body.checkedRows).toBeGreaterThan(0);
    expect(verifyRes.body.firstDivergentSequence).toBeNull();
  });

  it('audit log lists entries in sequence order', async () => {
    const listRes = await request(app.getHttpServer()).get('/api/v1/audit').expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThan(0);

    // Verify entries have expected fields
    const entry = listRes.body[0];
    expect(entry.sequence).toBeDefined();
    expect(entry.actorId).toBeDefined();
    expect(entry.action).toBeDefined();
    expect(entry.entryHash).toBeDefined();
    expect(entry.signature).toBeDefined();
  });
});
