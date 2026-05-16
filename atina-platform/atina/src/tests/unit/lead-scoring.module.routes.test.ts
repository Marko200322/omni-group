import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { LeadScoringModule } from '../../modules/lead-scoring/lead-scoring.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var leadScoringRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/lead-scoring/repository/lead-scoring.repository', () => {
  leadScoringRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    LeadScoringRepository: jest.fn().mockImplementation(() => leadScoringRepo),
  };
});

// eslint-disable-next-line no-var
var leadScoringEcosystemIdem: {
  withEcosystemIdempotencyLock: jest.Mock;
  findRecentEcosystemRunByIdempotencyKey: jest.Mock;
};

jest.mock('../../utils/ecosystem-idempotency', () => {
  leadScoringEcosystemIdem = {
    withEcosystemIdempotencyLock: jest.fn(async (_a: string, _b: string, work: () => Promise<unknown>) => work()),
    findRecentEcosystemRunByIdempotencyKey: jest.fn().mockResolvedValue({ rows: [] }),
  };
  return {
    normalizeEcosystemIdempotencyKey: (raw?: string | null) => (typeof raw === 'string' ? raw.trim() : ''),
    normalizeIdempotencyKeyHeader: (header: string | undefined | null) =>
      typeof header === 'string' ? header.trim() : '',
    withEcosystemIdempotencyLock: leadScoringEcosystemIdem.withEcosystemIdempotencyLock,
    findRecentEcosystemRunByIdempotencyKey: leadScoringEcosystemIdem.findRecentEcosystemRunByIdempotencyKey,
    ECOSYSTEM_IDEMPOTENCY_RUN_LOOKBACK_SQL: "NOW() - INTERVAL '24 hours'",
  };
});

let authEnabled = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authEnabled) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: 'user',
      email: 'u@test.com',
    };
    next();
  },
}));

describe('LeadScoringModule HTTP routes', () => {
  let server: http.Server;

  const expectSuccessSchema = (body: Record<string, unknown>) => {
    expect(body).toMatchObject({
      success: true,
      message: expect.any(String),
    });
    expect(body).toHaveProperty('data');
    expect(body).not.toHaveProperty('error');
  };

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new LeadScoringModule();
    await m.initialize();
    app.use('/lead-scoring', m.router);
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.statusCode, err.code, err.details);
      }
      return sendError(res, err.message || 'Error', 500);
    });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    authEnabled = true;
    jest.clearAllMocks();
    leadScoringRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    leadScoringRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    leadScoringRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    leadScoringRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    leadScoringRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
    leadScoringEcosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({ rows: [] });
  });

  it('GET lists workspaces', async () => {
    const res = await request(server).get('/lead-scoring');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
  });

  it('GET /status', async () => {
    const res = await request(server).get('/lead-scoring/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('presets');
  });

  it('POST /:id/run', async () => {
    const res = await request(server).post('/lead-scoring/sid/run').send({ mode: 'score', intensity: 40 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(leadScoringRepo.createRun).toHaveBeenCalled();
  });

  it('POST /:id/run reuses response for duplicate idempotency key within 24h', async () => {
    const reusedRun = {
      id: 'run-prior-ls',
      output_payload: { idempotency_key: 'k-ls', mode: 'score', intensity: 40 },
    };
    leadScoringEcosystemIdem.findRecentEcosystemRunByIdempotencyKey
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [reusedRun] });

    const first = await request(server)
      .post('/lead-scoring/sid/run')
      .set('Idempotency-Key', 'k-ls')
      .send({ mode: 'score', intensity: 40 });
    const second = await request(server)
      .post('/lead-scoring/sid/run')
      .set('Idempotency-Key', 'k-ls')
      .send({ mode: 'score', intensity: 40 });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expectSuccessSchema(first.body);
    expectSuccessSchema(second.body);
    expect(second.body.data.id).toBe('run-prior-ls');
    expect(leadScoringRepo.createRun).toHaveBeenCalledTimes(1);
    expect(leadScoringRepo.updateAfterRun).toHaveBeenCalledTimes(1);
    expect(leadScoringEcosystemIdem.withEcosystemIdempotencyLock).toHaveBeenCalledTimes(2);
    expect(leadScoringEcosystemIdem.findRecentEcosystemRunByIdempotencyKey).toHaveBeenCalledTimes(2);
  });

  it('POST /:id/run returns 409 when idempotency key reused with different parameters', async () => {
    leadScoringEcosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({
      rows: [{ output_payload: { mode: 'score', intensity: 5 } }],
    });
    const res = await request(server)
      .post('/lead-scoring/sid/run')
      .set('Idempotency-Key', 'idem-ls')
      .send({ mode: 'score', intensity: 40 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(leadScoringRepo.createRun).not.toHaveBeenCalled();
  });

  it('POST /:id/run 404 when not found', async () => {
    leadScoringRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/lead-scoring/xx/run').send({ mode: 'score', intensity: 20 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /lead-scoring returns 400 when query params are present', async () => {
    const res = await request(server).get('/lead-scoring').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /lead-scoring returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/lead-scoring').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /lead-scoring/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/lead-scoring/status').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /lead-scoring/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/lead-scoring/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /lead-scoring creates workspace with valid body', async () => {
    const res = await request(server).post('/lead-scoring').send({
      name: 'Lead score ws',
      budgetAllocated: 200,
      modelPreset: 'aggressive',
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(leadScoringRepo.create).toHaveBeenCalledWith('u1', 'Lead score ws', 200, 'aggressive');
  });

  it('POST /lead-scoring returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/lead-scoring')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.create).not.toHaveBeenCalled();
  });

  it('POST /lead-scoring returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/lead-scoring').send({ name: 'Good name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.create).not.toHaveBeenCalled();
  });

  it('POST /lead-scoring returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/lead-scoring').send({ name: 'Ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.create).not.toHaveBeenCalled();
  });

  it('POST /lead-scoring returns 400 when modelPreset is invalid', async () => {
    const res = await request(server).post('/lead-scoring').send({ name: 'Good name', modelPreset: 'turbo' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.create).not.toHaveBeenCalled();
  });

  it('POST /lead-scoring/:id/run returns 400 when workspace id format invalid', async () => {
    const res = await request(server).post('/lead-scoring/bad!!!/run').send({ mode: 'score', intensity: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /lead-scoring/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/lead-scoring/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'score', intensity: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /lead-scoring/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/lead-scoring/sid/run')
      .send({ mode: 'rank', intensity: 20, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /lead-scoring/:id/run returns 400 when intensity is out of range', async () => {
    const res = await request(server).post('/lead-scoring/sid/run').send({ mode: 'score', intensity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /lead-scoring/:id/run returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/lead-scoring/sid/run').send({ mode: 'blast', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /lead-scoring/:id/run returns 400 when revenueEstimate is not positive', async () => {
    const res = await request(server)
      .post('/lead-scoring/sid/run')
      .send({ mode: 'refresh', intensity: 50, revenueEstimate: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(leadScoringRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /lead-scoring', async () => {
    authEnabled = false;
    const res = await request(server).get('/lead-scoring');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(leadScoringRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /lead-scoring/status', async () => {
    authEnabled = false;
    const res = await request(server).get('/lead-scoring/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated POST /lead-scoring', async () => {
    authEnabled = false;
    const res = await request(server).post('/lead-scoring').send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(leadScoringRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /lead-scoring/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/lead-scoring/sid/run').send({ mode: 'score', intensity: 40 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(leadScoringRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated lead-scoring routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/lead-scoring').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(leadScoringRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server).get('/lead-scoring/status').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');

    res = await request(server)
      .post('/lead-scoring')
      .set(adminHdr)
      .send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(leadScoringRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/lead-scoring/sid/run')
      .set(adminHdr)
      .send({ mode: 'score', intensity: 40 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(leadScoringRepo.getOwned).not.toHaveBeenCalled();
  });
});
