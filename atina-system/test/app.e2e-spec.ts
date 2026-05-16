import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { SchedulerRegistry } from '@nestjs/schedule';
import { AppModule } from '../src/app.module';
import { configureHttpApp } from '../src/bootstrap/configure-app';
import { resetInternalQueueSmokeRateLimitForTests } from '../src/internal/assert-internal-queue-smoke-rate-limit';

/** Zahteva PostgreSQL + primenjene migracije (npr. `npm run migration:run`). U CI: E2E_WITH_DB=1. */
const hasDb = process.env.E2E_WITH_DB === '1';

/** Sprečava da @Cron tick (npr. SupplyAgent) ostane aktivan tokom `close()` i ispiše QueryFailedError u log. */
function stopCronJobs(app: INestApplication): void {
  try {
    const registry = app.get(SchedulerRegistry);
    for (const job of registry.getCronJobs().values()) {
      job.stop();
    }
  } catch {
    // Scheduler nije registrovan u ovom modulu — ignoriši
  }
}

(hasDb ? describe : describe.skip)('App (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    resetInternalQueueSmokeRateLimitForTests();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureHttpApp(app);
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      stopCronJobs(app);
      await app.close();
    }
  });

  it('GET /', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
        expect(res.body.name).toBe('atina-system');
      });
  });

  it('GET /health', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
        expect(res.body.ts).toBeDefined();
        expect(res.body.redis).toEqual(
          expect.objectContaining({
            configured: expect.any(Boolean),
          }),
        );
        expect(res.body.bull).toEqual(
          expect.objectContaining({
            enabled: expect.any(Boolean),
            queues: expect.any(Array),
          }),
        );
      });
  });

  it('POST /internal/queue/smoke (no Redis in CI)', () => {
    return request(app.getHttpServer())
      .post('/internal/queue/smoke')
      .expect(200)
      .expect((res) => {
        expect(res.body.bull).toBe(false);
      });
  });

  describe('internal queue smoke rate limit', () => {
    afterEach(() => {
      delete process.env.INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW;
    });

    it('POST /internal/queue/smoke returns 429 when over limit', async () => {
      process.env.INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW = '2';
      const srv = app.getHttpServer();
      await request(srv).post('/internal/queue/smoke').expect(200);
      await request(srv).post('/internal/queue/smoke').expect(200);
      await request(srv).post('/internal/queue/smoke').expect(429);
    });
  });

  describe('auth (JWT)', () => {
    const uniqueEmail = () =>
      `e2e-auth-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.com`;

    it('POST /auth/register returns JWT-shaped payload', async () => {
      const email = uniqueEmail();
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email, password: 'password12' })
        .expect(201);

      expect(typeof res.body.access_token).toBe('string');
      expect(res.body.access_token.split('.')).toHaveLength(3);
      expect(res.body.user).toEqual(
        expect.objectContaining({ email, id: expect.any(String) }),
      );
    });

    it('POST /auth/register returns 409 when email already exists', async () => {
      const email = uniqueEmail();
      const srv = app.getHttpServer();
      await request(srv)
        .post('/auth/register')
        .send({ email, password: 'password12' })
        .expect(201);
      await request(srv)
        .post('/auth/register')
        .send({ email, password: 'password12' })
        .expect(409);
    });

    it('POST /auth/login returns 401 for wrong password', async () => {
      const email = uniqueEmail();
      const srv = app.getHttpServer();
      await request(srv)
        .post('/auth/register')
        .send({ email, password: 'password12' })
        .expect(201);
      await request(srv)
        .post('/auth/login')
        .send({ email, password: 'wrong-pass-1' })
        .expect(401);
    });

    it('POST /auth/login returns JWT for valid credentials', async () => {
      const email = uniqueEmail();
      const srv = app.getHttpServer();
      await request(srv)
        .post('/auth/register')
        .send({ email, password: 'password12' })
        .expect(201);

      const res = await request(srv)
        .post('/auth/login')
        .send({ email, password: 'password12' })
        .expect(201);

      expect(res.body.access_token.split('.')).toHaveLength(3);
      expect(res.body.user).toEqual(
        expect.objectContaining({ email, id: expect.any(String) }),
      );
    });
  });

  describe('internal queue smoke key', () => {
    afterEach(() => {
      delete process.env.INTERNAL_QUEUE_SMOKE_KEY;
    });

    it('POST /internal/queue/smoke returns 403 without header when key env set', async () => {
      process.env.INTERNAL_QUEUE_SMOKE_KEY = 'e2e-queue-smoke-secret';
      await request(app.getHttpServer()).post('/internal/queue/smoke').expect(403);
    });

    it('POST /internal/queue/smoke returns 200 with valid header (no Bull in CI)', async () => {
      process.env.INTERNAL_QUEUE_SMOKE_KEY = 'e2e-queue-smoke-secret';
      return request(app.getHttpServer())
        .post('/internal/queue/smoke')
        .set('x-internal-queue-smoke-key', 'e2e-queue-smoke-secret')
        .expect(200)
        .expect((res) => {
          expect(res.body.bull).toBe(false);
        });
    });
  });
});
