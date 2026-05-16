import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { AtinaSystemModule } from '../../../../modules/atina-system/atina-system.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var atinaSystemRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../../../modules/atina-system/repository/atina-system.repository', () => {
  atinaSystemRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    AtinaSystemRepository: jest.fn().mockImplementation(() => atinaSystemRepo),
  };
});

let authEnabled = true;
jest.mock('../../../../api/middleware/auth.middleware', () => ({
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

describe('AtinaSystemModule HTTP routes', () => {
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
    const m = new AtinaSystemModule();
    await m.initialize();
    app.use('/atina-system', m.router);
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
    atinaSystemRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    atinaSystemRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    atinaSystemRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    atinaSystemRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    atinaSystemRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('GET /atina-system lists workspaces', async () => {
    const res = await request(server).get('/atina-system');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toEqual([{ id: 'w1' }]);
  });

  it('GET /atina-system/status returns system status', async () => {
    const res = await request(server).get('/atina-system/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('providers');
    expect(res.body.data).toHaveProperty('nextProvider');
    expect(res.body.data).toHaveProperty('capacity');
    expect(res.body.data).toHaveProperty('prodEnvReadiness');
    expect(res.body.data.prodEnvReadiness).toMatchObject({
      nodeEnv: expect.any(String),
      isProduction: expect.any(Boolean),
      dbSsl: expect.any(Boolean),
    });
  });

  it('POST /atina-system creates workspace', async () => {
    const res = await request(server).post('/atina-system').send({ name: 'Atina', budgetAllocated: 0 });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(atinaSystemRepo.create).toHaveBeenCalled();
  });

  it('POST /atina-system returns 400 for invalid create payload', async () => {
    const res = await request(server).post('/atina-system').send({
      name: 'ab',
      budgetAllocated: -1,
      unknownField: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(atinaSystemRepo.create).not.toHaveBeenCalled();
  });

  it('POST /atina-system/:id/run', async () => {
    const res = await request(server).post('/atina-system/sid/run').send({ mode: 'sync', intensity: 22 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data.id).toBe('run-http');
    expect(atinaSystemRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'atina-system_sync',
      expect.objectContaining({
        throughput: 22,
        qualityScore: 78,
        estimatedRevenue: 22,
        mode: 'sync',
        intensity: 22,
      })
    );
  });

  it('POST /atina-system/:id/run returns 400 for invalid run payload', async () => {
    const res = await request(server).post('/atina-system/sid/run').send({
      mode: 'invalid-mode',
      intensity: 0.5,
      extra: 'not-allowed',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(atinaSystemRepo.createRun).not.toHaveBeenCalled();
  });

  it('POST /atina-system/:id/run returns 400 for invalid id param', async () => {
    const res = await request(server).post('/atina-system/invalid id!/run').send({ mode: 'sync', intensity: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(atinaSystemRepo.getOwned).not.toHaveBeenCalled();
  });

  it('GET /atina-system returns 401 when unauthenticated', async () => {
    authEnabled = false;
    const res = await request(server).get('/atina-system');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(atinaSystemRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /atina-system/status returns 401 when unauthenticated', async () => {
    authEnabled = false;
    const res = await request(server).get('/atina-system/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /atina-system returns 401 when unauthenticated even with x-test-role admin header', async () => {
    authEnabled = false;
    const res = await request(server).get('/atina-system').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(atinaSystemRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /atina-system/status returns 401 when unauthenticated even with x-test-role admin header', async () => {
    authEnabled = false;
    const res = await request(server).get('/atina-system/status').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('POST /atina-system/:id/run 404 when not found', async () => {
    atinaSystemRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/atina-system/xx/run').send({ mode: 'sync', intensity: 22 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /atina-system returns 400 when query params are present', async () => {
    const res = await request(server).get('/atina-system').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(atinaSystemRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /atina-system returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/atina-system').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(atinaSystemRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /atina-system/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/atina-system/status').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /atina-system/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/atina-system/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /atina-system returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/atina-system')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(atinaSystemRepo.create).not.toHaveBeenCalled();
  });

  it('POST /atina-system creates workspace with operatingMode', async () => {
    const res = await request(server).post('/atina-system').send({
      name: 'Sys ws',
      budgetAllocated: 5,
      operatingMode: 'efficiency',
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(atinaSystemRepo.create).toHaveBeenCalledWith('u1', 'Sys ws', 5, 'efficiency');
  });

  it('POST /atina-system returns 400 when operatingMode is invalid', async () => {
    const res = await request(server).post('/atina-system').send({ name: 'Good name', operatingMode: 'turbo' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(atinaSystemRepo.create).not.toHaveBeenCalled();
  });

  it('POST /atina-system/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/atina-system/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'sync', intensity: 22 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(atinaSystemRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /atina-system/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/atina-system/sid/run')
      .send({ mode: 'optimize', intensity: 30, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(atinaSystemRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /atina-system/:id/run returns 400 when intensity is out of range', async () => {
    const res = await request(server).post('/atina-system/sid/run').send({ mode: 'sync', intensity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(atinaSystemRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /atina-system', async () => {
    authEnabled = false;
    const res = await request(server).post('/atina-system').send({ name: 'No session', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(atinaSystemRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /atina-system/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/atina-system/sid/run').send({ mode: 'sync', intensity: 22 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(atinaSystemRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /atina-system routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server)
      .post('/atina-system')
      .set(adminHdr)
      .send({ name: 'No session', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(atinaSystemRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/atina-system/sid/run')
      .set(adminHdr)
      .send({ mode: 'sync', intensity: 22 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(atinaSystemRepo.getOwned).not.toHaveBeenCalled();
  });
});
