import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { ClientHunterModule } from '../../modules/client-hunter/client-hunter.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var clientHunterRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/client-hunter/repository/client-hunter.repository', () => {
  clientHunterRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    ClientHunterRepository: jest.fn().mockImplementation(() => clientHunterRepo),
  };
});

// eslint-disable-next-line no-var
var clientHunterEcosystemIdem: {
  withEcosystemIdempotencyLock: jest.Mock;
  findRecentEcosystemRunByIdempotencyKey: jest.Mock;
};

jest.mock('../../utils/ecosystem-idempotency', () => {
  clientHunterEcosystemIdem = {
    withEcosystemIdempotencyLock: jest.fn(async (_a: string, _b: string, work: () => Promise<unknown>) => work()),
    findRecentEcosystemRunByIdempotencyKey: jest.fn().mockResolvedValue({ rows: [] }),
  };
  return {
    normalizeEcosystemIdempotencyKey: (raw?: string | null) => (typeof raw === 'string' ? raw.trim() : ''),
    normalizeIdempotencyKeyHeader: (header: string | undefined | null) =>
      typeof header === 'string' ? header.trim() : '',
    withEcosystemIdempotencyLock: clientHunterEcosystemIdem.withEcosystemIdempotencyLock,
    findRecentEcosystemRunByIdempotencyKey: clientHunterEcosystemIdem.findRecentEcosystemRunByIdempotencyKey,
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

describe('ClientHunterModule HTTP routes', () => {
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
    const m = new ClientHunterModule();
    await m.initialize();
    app.use('/client-hunter', m.router);
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
    clientHunterRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    clientHunterRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    clientHunterRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    clientHunterRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    clientHunterRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
    clientHunterEcosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({ rows: [] });
  });

  it('GET lists workspaces', async () => {
    const res = await request(server).get('/client-hunter');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
  });

  it('GET /status returns shape', async () => {
    const res = await request(server).get('/client-hunter/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('strategies');
  });

  it('POST /:id/run', async () => {
    const res = await request(server).post('/client-hunter/sid/run').send({ mode: 'hunt', intensity: 30 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(clientHunterRepo.createRun).toHaveBeenCalled();
  });

  it('POST /:id/run reuses response for duplicate idempotency key within 24h', async () => {
    const reusedRun = {
      id: 'run-prior',
      output_payload: { idempotency_key: 'k-ch', mode: 'hunt', intensity: 22 },
    };
    clientHunterEcosystemIdem.findRecentEcosystemRunByIdempotencyKey
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [reusedRun] });

    const first = await request(server)
      .post('/client-hunter/sid/run')
      .set('Idempotency-Key', 'k-ch')
      .send({ mode: 'hunt', intensity: 22 });
    const second = await request(server)
      .post('/client-hunter/sid/run')
      .set('Idempotency-Key', 'k-ch')
      .send({ mode: 'hunt', intensity: 22 });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expectSuccessSchema(first.body);
    expectSuccessSchema(second.body);
    expect(second.body.data.id).toBe('run-prior');
    expect(clientHunterRepo.createRun).toHaveBeenCalledTimes(1);
    expect(clientHunterRepo.updateAfterRun).toHaveBeenCalledTimes(1);
    expect(clientHunterEcosystemIdem.withEcosystemIdempotencyLock).toHaveBeenCalledTimes(2);
    expect(clientHunterEcosystemIdem.findRecentEcosystemRunByIdempotencyKey).toHaveBeenCalledTimes(2);
  });

  it('POST /:id/run returns 409 when idempotency key reused with different parameters', async () => {
    clientHunterEcosystemIdem.findRecentEcosystemRunByIdempotencyKey.mockResolvedValue({
      rows: [{ output_payload: { mode: 'hunt', intensity: 10 } }],
    });
    const res = await request(server)
      .post('/client-hunter/sid/run')
      .set('Idempotency-Key', 'idem-conflict')
      .send({ mode: 'hunt', intensity: 99 });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(clientHunterRepo.createRun).not.toHaveBeenCalled();
  });

  it('POST /:id/run 404 when not found', async () => {
    clientHunterRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/client-hunter/xx/run').send({ mode: 'hunt', intensity: 20 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /client-hunter returns 400 when query params are present', async () => {
    const res = await request(server).get('/client-hunter').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /client-hunter returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/client-hunter').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /client-hunter/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/client-hunter/status').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /client-hunter/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/client-hunter/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /client-hunter creates workspace with valid body', async () => {
    const res = await request(server).post('/client-hunter').send({
      name: 'Hunter workspace',
      budgetAllocated: 50,
      huntStrategy: 'targeted',
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(clientHunterRepo.create).toHaveBeenCalledWith('u1', 'Hunter workspace', 50, 'targeted');
  });

  it('POST /client-hunter returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/client-hunter')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.create).not.toHaveBeenCalled();
  });

  it('POST /client-hunter returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/client-hunter').send({ name: 'Good name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.create).not.toHaveBeenCalled();
  });

  it('POST /client-hunter returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/client-hunter').send({ name: 'Ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.create).not.toHaveBeenCalled();
  });

  it('POST /client-hunter returns 400 when huntStrategy is invalid', async () => {
    const res = await request(server).post('/client-hunter').send({ name: 'Good name', huntStrategy: 'snipe' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.create).not.toHaveBeenCalled();
  });

  it('POST /client-hunter/:id/run returns 400 when workspace id format invalid', async () => {
    const res = await request(server).post('/client-hunter/bad!!!/run').send({ mode: 'hunt', intensity: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /client-hunter/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/client-hunter/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'hunt', intensity: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /client-hunter/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/client-hunter/sid/run')
      .send({ mode: 'discover', intensity: 20, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /client-hunter/:id/run returns 400 when intensity is out of range', async () => {
    const res = await request(server).post('/client-hunter/sid/run').send({ mode: 'hunt', intensity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /client-hunter/:id/run returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/client-hunter/sid/run').send({ mode: 'blast', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /client-hunter/:id/run returns 400 when revenueEstimate is not positive', async () => {
    const res = await request(server)
      .post('/client-hunter/sid/run')
      .send({ mode: 'nurture', intensity: 50, revenueEstimate: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(clientHunterRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /client-hunter', async () => {
    authEnabled = false;
    const res = await request(server).get('/client-hunter');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(clientHunterRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /client-hunter/status', async () => {
    authEnabled = false;
    const res = await request(server).get('/client-hunter/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated POST /client-hunter', async () => {
    authEnabled = false;
    const res = await request(server).post('/client-hunter').send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(clientHunterRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /client-hunter/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/client-hunter/sid/run').send({ mode: 'hunt', intensity: 30 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(clientHunterRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated client-hunter routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/client-hunter').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(clientHunterRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server).get('/client-hunter/status').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');

    res = await request(server)
      .post('/client-hunter')
      .set(adminHdr)
      .send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(clientHunterRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/client-hunter/sid/run')
      .set(adminHdr)
      .send({ mode: 'hunt', intensity: 30 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(clientHunterRepo.getOwned).not.toHaveBeenCalled();
  });
});
