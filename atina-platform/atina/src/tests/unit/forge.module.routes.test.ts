import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { ForgeModule } from '../../modules/forge/forge.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var forgeRepo: {
  findRecentRunByIdempotencyKey: jest.Mock;
  createRunAndUpdateWithIdempotency: jest.Mock;
  withIdempotencyLock: jest.Mock;
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/forge/repository/forge.repository', () => {
  forgeRepo = {
    findRecentRunByIdempotencyKey: jest.fn().mockResolvedValue({ rows: [] }),
    createRunAndUpdateWithIdempotency: jest.fn().mockResolvedValue({ row: { id: 'run-http' }, reused: false }),
    withIdempotencyLock: jest.fn().mockImplementation(async (_systemId: string, _key: string, fn: () => Promise<unknown>) => {
      return fn();
    }),
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'f1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-f' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    ForgeRepository: jest.fn().mockImplementation(() => forgeRepo),
  };
});

jest.mock('../../modules/forge/service/titan-forge.service', () => ({
  TitanForgeService: jest.fn().mockImplementation(() => ({
    forge: jest.fn().mockResolvedValue({
      provider: 'oracle',
      costRsd: 25,
      remainingBudgetRsd: 9999,
      resourceId: 'res-1',
      eventId: 'evt-1',
    }),
    getStatus: jest.fn().mockResolvedValue({
      providers: ['oracle', 'aws', 'azure'],
      nextProvider: 'oracle',
      budgetRsd: { initial: 10000, remaining: 9999, spent: 1 },
      budgetGuard: { minReserveRsd: 0, hardStopMode: false, availableToSpendRsd: 9999 },
      recentEvents: [],
    }),
  })),
}));

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

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('ForgeModule HTTP routes', () => {
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
    const m = new ForgeModule();
    await m.initialize();
    app.use('/forge', m.router);
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
    forgeRepo.listByUser.mockResolvedValue({ rows: [{ id: 'f1' }] });
    forgeRepo.create.mockResolvedValue({ rows: [{ id: 'new-f' }] });
    forgeRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    forgeRepo.findRecentRunByIdempotencyKey.mockResolvedValue({ rows: [] });
    forgeRepo.createRunAndUpdateWithIdempotency.mockResolvedValue({ row: { id: 'run-http' }, reused: false });
    forgeRepo.withIdempotencyLock.mockImplementation(async (_systemId: string, _key: string, fn: () => Promise<unknown>) => {
      return fn();
    });
    forgeRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    forgeRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('GET /forge lists workspaces', async () => {
    const res = await request(server).get('/forge');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toEqual([{ id: 'f1' }]);
  });

  it('GET /forge rejects unknown query keys (strict)', async () => {
    const res = await request(server).get('/forge').query({ extra: '1' });
    expect(res.status).toBe(400);
    expect(forgeRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /forge/status rejects unknown query keys (strict)', async () => {
    const res = await request(server).get('/forge/status').query({ foo: 'bar' });
    expect(res.status).toBe(400);
  });

  it('GET /forge/status returns vault status', async () => {
    const res = await request(server).get('/forge/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('budgetRsd');
    expect(res.body.data).toHaveProperty('nextProvider');
  });

  it('POST /forge creates workspace', async () => {
    const res = await request(server).post('/forge').send({ name: 'Forge', budgetAllocated: 0 });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(forgeRepo.create).toHaveBeenCalled();
  });

  it('POST /forge/:id/run', async () => {
    const res = await request(server).post('/forge/sid/run').send({ mode: 'smelt', intensity: 22 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data.id).toBe('run-http');
  });

  it('POST /forge/:id/run accepts empty body (defaults) and rejects unknown keys', async () => {
    const ok = await request(server).post('/forge/sid/run').send({});
    expect(ok.status).toBe(200);
    expectSuccessSchema(ok.body);

    const bad = await request(server).post('/forge/sid/run').send({ mode: 'smelt', extra: true });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /forge/:id/run reuses response for duplicate idempotency key within 24h', async () => {
    const reusedRun = {
      id: 'run-http',
      output_payload: { idempotency_key: 'k-123', mode: 'smelt', intensity: 22 },
    };
    forgeRepo.findRecentRunByIdempotencyKey
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [reusedRun] });

    const first = await request(server)
      .post('/forge/sid/run')
      .set('Idempotency-Key', 'k-123')
      .send({ mode: 'smelt', intensity: 22 });
    const second = await request(server)
      .post('/forge/sid/run')
      .set('Idempotency-Key', 'k-123')
      .send({ mode: 'smelt', intensity: 22 });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expectSuccessSchema(first.body);
    expectSuccessSchema(second.body);
    expect(second.body.data.id).toBe('run-http');
    expect(forgeRepo.createRun).toHaveBeenCalledTimes(1);
    expect(forgeRepo.updateAfterRun).toHaveBeenCalledTimes(1);
    expect(forgeRepo.withIdempotencyLock).toHaveBeenCalledTimes(2);
    expect(forgeRepo.findRecentRunByIdempotencyKey).toHaveBeenCalledTimes(2);
  });

  it('POST /forge/:id/run 404 when not found', async () => {
    forgeRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/forge/xx/run').send({ mode: 'smelt', intensity: 22 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /forge/:id/run returns 400 for invalid id param', async () => {
    const res = await request(server).post('/forge/invalid id!/run').send({ mode: 'smelt', intensity: 22 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(forgeRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /forge', async () => {
    authEnabled = false;
    const res = await request(server).get('/forge');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(forgeRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /forge/status', async () => {
    authEnabled = false;
    const res = await request(server).get('/forge/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated POST /forge', async () => {
    authEnabled = false;
    const res = await request(server)
      .post('/forge')
      .send({ name: 'No auth', budgetAllocated: 0, operatingMode: 'steady' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(forgeRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /forge/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/forge/sid/run').send({ mode: 'smelt', intensity: 22 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(forgeRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated forge routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/forge').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(forgeRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server).get('/forge/status').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');

    res = await request(server)
      .post('/forge')
      .set(adminHdr)
      .send({ name: 'No auth', budgetAllocated: 0, operatingMode: 'steady' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(forgeRepo.create).not.toHaveBeenCalled();

    res = await request(server).post('/forge/sid/run').set(adminHdr).send({ mode: 'smelt', intensity: 22 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(forgeRepo.getOwned).not.toHaveBeenCalled();
  });

  it('GET /forge returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/forge').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(forgeRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /forge/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/forge/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /forge returns 400 when query params are present', async () => {
    const res = await request(server).post('/forge').query({ draft: '1' }).send({ name: 'ABC', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(forgeRepo.create).not.toHaveBeenCalled();
  });

  it('POST /forge returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/forge').send({ name: 'GoodName', budgetAllocated: 0, extra: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(forgeRepo.create).not.toHaveBeenCalled();
  });

  it('POST /forge returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/forge').send({ name: 'ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(forgeRepo.create).not.toHaveBeenCalled();
  });

  it('POST /forge returns 400 when operatingMode is invalid', async () => {
    const res = await request(server)
      .post('/forge')
      .send({ name: 'Valid', budgetAllocated: 0, operatingMode: 'turbo' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(forgeRepo.create).not.toHaveBeenCalled();
  });

  it('POST /forge/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/forge/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'smelt', intensity: 22 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(forgeRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /forge/:id/run returns 400 when intensity is out of range', async () => {
    const res = await request(server).post('/forge/sid/run').send({ mode: 'smelt', intensity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(forgeRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /forge/:id/run returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/forge/sid/run').send({ mode: 'blast', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(forgeRepo.getOwned).not.toHaveBeenCalled();
  });
});
