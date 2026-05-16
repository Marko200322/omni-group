import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { ProxyRotationModule } from '../../modules/proxy-rotation/proxy-rotation.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var proxyRotationRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/proxy-rotation/repository/proxy-rotation.repository', () => {
  proxyRotationRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({
      rows: [{ id: 'sid', config: { pool_size: 5, rotation_index: 0 } }],
      rowCount: 1,
    }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    ProxyRotationRepository: jest.fn().mockImplementation(() => proxyRotationRepo),
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

describe('ProxyRotationModule HTTP routes', () => {
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
    const m = new ProxyRotationModule();
    await m.initialize();
    app.use('/proxy-rotation', m.router);
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
    proxyRotationRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    proxyRotationRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    proxyRotationRepo.getOwned.mockResolvedValue({
      rows: [{ id: 'sid', config: { pool_size: 5, rotation_index: 0 } }],
      rowCount: 1,
    });
    proxyRotationRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    proxyRotationRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('GET /proxy-rotation lists workspaces', async () => {
    const res = await request(server).get('/proxy-rotation');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
  });

  it('GET /status', async () => {
    const res = await request(server).get('/proxy-rotation/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('poolPolicy');
  });

  it('POST /:id/run', async () => {
    const res = await request(server).post('/proxy-rotation/sid/run').send({ mode: 'rotate', intensity: 20 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(proxyRotationRepo.createRun).toHaveBeenCalled();
  });

  it('POST /:id/run 404 when not found', async () => {
    proxyRotationRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/proxy-rotation/xx/run').send({ mode: 'rotate', intensity: 20 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /proxy-rotation returns 400 when query params are present', async () => {
    const res = await request(server).get('/proxy-rotation').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /proxy-rotation returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/proxy-rotation').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /proxy-rotation/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/proxy-rotation/status').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /proxy-rotation/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/proxy-rotation/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /proxy-rotation creates workspace with valid body', async () => {
    const res = await request(server).post('/proxy-rotation').send({
      name: 'Proxy pool',
      budgetAllocated: 10,
      poolSize: 25,
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(proxyRotationRepo.create).toHaveBeenCalledWith('u1', 'Proxy pool', 10, 25);
  });

  it('POST /proxy-rotation returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/proxy-rotation')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.create).not.toHaveBeenCalled();
  });

  it('POST /proxy-rotation returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/proxy-rotation').send({ name: 'Good name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.create).not.toHaveBeenCalled();
  });

  it('POST /proxy-rotation returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/proxy-rotation').send({ name: 'Ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.create).not.toHaveBeenCalled();
  });

  it('POST /proxy-rotation returns 400 when poolSize is below minimum', async () => {
    const res = await request(server).post('/proxy-rotation').send({ name: 'Good name', poolSize: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.create).not.toHaveBeenCalled();
  });

  it('POST /proxy-rotation/:id/run returns 400 when workspace id format invalid', async () => {
    const res = await request(server).post('/proxy-rotation/bad!!!/run').send({ mode: 'rotate', intensity: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /proxy-rotation/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/proxy-rotation/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'rotate', intensity: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /proxy-rotation/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/proxy-rotation/sid/run')
      .send({ mode: 'health', intensity: 20, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /proxy-rotation/:id/run returns 400 when intensity is out of range', async () => {
    const res = await request(server).post('/proxy-rotation/sid/run').send({ mode: 'rotate', intensity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /proxy-rotation/:id/run returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/proxy-rotation/sid/run').send({ mode: 'blast', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /proxy-rotation/:id/run returns 400 when revenueEstimate is not positive', async () => {
    const res = await request(server)
      .post('/proxy-rotation/sid/run')
      .send({ mode: 'register-pool', intensity: 50, revenueEstimate: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /proxy-rotation', async () => {
    authEnabled = false;
    const res = await request(server).get('/proxy-rotation');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(proxyRotationRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /proxy-rotation/status', async () => {
    authEnabled = false;
    const res = await request(server).get('/proxy-rotation/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated POST /proxy-rotation', async () => {
    authEnabled = false;
    const res = await request(server).post('/proxy-rotation').send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(proxyRotationRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /proxy-rotation/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/proxy-rotation/sid/run').send({ mode: 'rotate', intensity: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated proxy-rotation routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/proxy-rotation').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(proxyRotationRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server).get('/proxy-rotation/status').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');

    res = await request(server)
      .post('/proxy-rotation')
      .set(adminHdr)
      .send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(proxyRotationRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/proxy-rotation/sid/run')
      .set(adminHdr)
      .send({ mode: 'rotate', intensity: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });
});
