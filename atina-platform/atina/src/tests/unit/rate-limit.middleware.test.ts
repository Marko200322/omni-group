import request from 'supertest';
import express from 'express';

/** Rate limit and app error payloads both use success + nested error (see sendError). */
function expectApiErrorEnvelope(body: Record<string, unknown>): void {
  expect(body).toEqual(
    expect.objectContaining({
      success: false,
      error: expect.objectContaining({
        code: expect.any(String),
        message: expect.any(String),
      }),
    })
  );
}

describe('rate-limit middleware security hardening', () => {
  afterEach(() => {
    delete process.env.AUTH_RATE_LIMIT_WINDOW_MS;
    delete process.env.AUTH_RATE_LIMIT_MAX;
    delete process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS;
    delete process.env.AUTH_SESSION_RATE_LIMIT_MAX;
    delete process.env.ADMIN_MUTATION_RATE_LIMIT_WINDOW_MS;
    delete process.env.ADMIN_MUTATION_RATE_LIMIT_MAX;
    delete process.env.PAYMENTS_RATE_LIMIT_WINDOW_MS;
    delete process.env.PAYMENTS_RATE_LIMIT_MAX;
    delete process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS;
    delete process.env.WEBHOOK_RATE_LIMIT_MAX;
    delete process.env.PASSWORD_RESET_WINDOW_MS;
    delete process.env.PASSWORD_RESET_MAX;
    jest.resetModules();
  });

  it('authLimiter does not trust spoofed x-forwarded-for header', async () => {
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    const { authLimiter } = await import('../../api/middleware/rate-limit.middleware');

    const app = express();
    app.use(express.json());
    app.post('/login', authLimiter, (_req, res) => res.status(200).json({ ok: true }));

    await request(app)
      .post('/login')
      .set('x-forwarded-for', '198.51.100.10')
      .send({ email: 'user@atina.io' })
      .expect(200);

    const blocked = await request(app)
      .post('/login')
      .set('x-forwarded-for', '198.51.100.11')
      .send({ email: 'user@atina.io' });

    expect(blocked.status).toBe(429);
    expectApiErrorEnvelope(blocked.body);
    expect(blocked.body.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.body.error?.message).toBe('Too many requests');
    expect(blocked.body.error?.details?.route).toBe('/login');
  });

  it('authLimiter buckets separately per normalized email (trim + lowercase)', async () => {
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    const { authLimiter } = await import('../../api/middleware/rate-limit.middleware');

    const app = express();
    app.use(express.json());
    app.post('/login', authLimiter, (_req, res) => res.status(200).json({ ok: true }));

    await request(app).post('/login').send({ email: '  User@Atina.IO  ' }).expect(200);
    await request(app).post('/login').send({ email: 'user@atina.io' }).expect(429);
  });

  it('authLimiter uses no-email bucket when body.email is not a string', async () => {
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_RATE_LIMIT_MAX = '1';
    const { authLimiter } = await import('../../api/middleware/rate-limit.middleware');

    const app = express();
    app.use(express.json());
    app.post('/login', authLimiter, (_req, res) => res.status(200).json({ ok: true }));

    await request(app).post('/login').send({ email: 123 }).expect(200);
    await request(app).post('/login').send({ email: null }).expect(429);
  });

  it('authSessionLimiter rate limits by authenticated user', async () => {
    process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_SESSION_RATE_LIMIT_MAX = '1';
    const { authSessionLimiter } = await import('../../api/middleware/rate-limit.middleware');

    const app = express();
    app.use((req, _res, next) => {
      req.user = { userId: 'user-1', role: 'admin', email: 'user@atina.io' };
      next();
    });
    app.get('/me', authSessionLimiter, (_req, res) => res.status(200).json({ ok: true }));

    await request(app).get('/me').expect(200);
    const blocked = await request(app).get('/me');
    expect(blocked.status).toBe(429);
    expectApiErrorEnvelope(blocked.body);
    expect(blocked.body.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blocked.body.error?.details?.route).toBe('/me');
  });

  it('authSessionLimiter uses anonymous bucket when req.user.userId is missing', async () => {
    process.env.AUTH_SESSION_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.AUTH_SESSION_RATE_LIMIT_MAX = '1';
    const { authSessionLimiter } = await import('../../api/middleware/rate-limit.middleware');

    const app = express();
    app.use((req, _res, next) => {
      req.user = { userId: '', role: 'user', email: 'a@b.com' };
      next();
    });
    app.get('/anon', authSessionLimiter, (_req, res) => res.status(200).json({ ok: true }));

    await request(app).get('/anon').expect(200);
    const blocked = await request(app).get('/anon');
    expect(blocked.status).toBe(429);
  });

  it('adminMutationLimiter buckets by userId when present (line 80 branch)', async () => {
    process.env.ADMIN_MUTATION_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.ADMIN_MUTATION_RATE_LIMIT_MAX = '1';
    const { adminMutationLimiter } = await import('../../api/middleware/rate-limit.middleware');

    const app = express();
    app.use((req, _res, next) => {
      req.user = { userId: 'admin-a', role: 'admin', email: 'a@b.com' };
      next();
    });
    app.post('/mut', adminMutationLimiter, (_req, res) => res.status(200).json({ ok: true }));

    await request(app).post('/mut').expect(200);
    await request(app).post('/mut').expect(429);
  });

  it('adminMutationLimiter uses anonymous when req.user is absent', async () => {
    process.env.ADMIN_MUTATION_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.ADMIN_MUTATION_RATE_LIMIT_MAX = '1';
    const { adminMutationLimiter } = await import('../../api/middleware/rate-limit.middleware');

    const app = express();
    app.post('/mut', adminMutationLimiter, (_req, res) => res.status(200).json({ ok: true }));

    await request(app).post('/mut').expect(200);
    const blocked = await request(app).post('/mut');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error?.details?.route).toBe('/mut');
  });

  it('exposes standard RateLimit-* headers and optional Retry-After on 429', async () => {
    process.env.WEBHOOK_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.WEBHOOK_RATE_LIMIT_MAX = '1';
    const { webhookLimiter } = await import('../../api/middleware/rate-limit.middleware');

    const app = express();
    app.post('/hook', webhookLimiter, (_req, res) => res.status(200).send());

    await request(app).post('/hook').expect(200);
    const blocked = await request(app).post('/hook').expect(429);

    expect(blocked.headers['ratelimit-limit']).toBeDefined();
    expect(blocked.headers['ratelimit-remaining']).toBeDefined();
    expect(blocked.headers['ratelimit-reset']).toBeDefined();

    const retryAfter = blocked.headers['retry-after'];
    if (retryAfter !== undefined) {
      const seconds = Number(Array.isArray(retryAfter) ? retryAfter[0] : retryAfter);
      expect(Number.isFinite(seconds)).toBe(true);
      expect(blocked.body.error?.details?.retryAfterSeconds).toBe(seconds);
    } else {
      expect(blocked.body.error?.details?.retryAfterSeconds).toBeUndefined();
    }
  });

  it('paymentsLimiter uses client key only (no body identity)', async () => {
    process.env.PAYMENTS_RATE_LIMIT_WINDOW_MS = '60000';
    process.env.PAYMENTS_RATE_LIMIT_MAX = '1';
    const { paymentsLimiter } = await import('../../api/middleware/rate-limit.middleware');

    const app = express();
    app.use(express.json());
    app.post('/pay', paymentsLimiter, (_req, res) => res.status(200).json({ ok: true }));

    await request(app).post('/pay').send({}).expect(200);
    await request(app).post('/pay').send({ x: 1 }).expect(429);
  });

  it('passwordResetLimiter shares auth-style keying', async () => {
    process.env.PASSWORD_RESET_WINDOW_MS = '60000';
    process.env.PASSWORD_RESET_MAX = '1';
    const { passwordResetLimiter } = await import('../../api/middleware/rate-limit.middleware');

    const app = express();
    app.use(express.json());
    app.post('/reset', passwordResetLimiter, (_req, res) => res.status(200).json({ ok: true }));

    await request(app).post('/reset').send({ email: 'u@x.com' }).expect(200);
    await request(app).post('/reset').send({ email: 'u@x.com' }).expect(429);
  });
});
