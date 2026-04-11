import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * E2E tests for the records module.
 * These tests require a running Postgres instance (via docker compose).
 *
 * Run: docker compose up -d postgres && yarn workspace vault-api test:e2e
 */
describe('Records (e2e)', () => {
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

    // Seed a tenant and user
    const tenantRes = await request(app.getHttpServer())
      .post('/api/v1/tenants')
      .send({ name: 'E2E Test Tenant' })
      .expect(201);
    tenantId = tenantRes.body.id;

    const userRes = await request(app.getHttpServer())
      .post('/api/v1/users')
      .send({ tenantId, email: 'e2e@test.com', role: 'admin' })
      .expect(201);
    userId = userRes.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('encrypted round-trip: create → retrieve → verify plaintext fidelity', async () => {
    const payload = {
      notes: 'Sensitive compliance data',
      score: 42,
      nested: { deep: true },
    };

    // Create a record (encrypts the payload)
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/records')
      .send({ tenantId, ownerId: userId, payload })
      .expect(201);

    expect(createRes.body.id).toBeDefined();
    expect(createRes.body.payload).toEqual(payload);
    expect(createRes.body.version).toBe(1);

    // Retrieve the record (decrypts the payload)
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/records/${createRes.body.id}`)
      .expect(200);

    expect(getRes.body.payload).toEqual(payload);
  });

  it('rejects validation errors with RFC 7807', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/records')
      .send({ tenantId: 'not-a-uuid', ownerId: userId, payload: {} })
      .expect(422);

    expect(res.body.type).toContain('validation-error');
    expect(res.body.title).toBe('Validation Error');
    expect(res.body.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it('optimistic concurrency: 409 on stale version', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/records')
      .send({ tenantId, ownerId: userId, payload: { v: 1 } })
      .expect(201);

    const recordId = createRes.body.id;

    // First update succeeds
    await request(app.getHttpServer())
      .put(`/api/v1/records/${recordId}`)
      .send({ tenantId, payload: { v: 2 }, version: 1 })
      .expect(200);

    // Second update with stale version fails
    const conflictRes = await request(app.getHttpServer())
      .put(`/api/v1/records/${recordId}`)
      .send({ tenantId, payload: { v: 3 }, version: 1 })
      .expect(409);

    expect(conflictRes.body.type).toContain('version-conflict');
  });

  it('returns 404 for non-existent record', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/records/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(res.body.type).toContain('not-found');
  });
});
