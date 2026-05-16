import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { ProxyRotationModule } from '../../../../modules/proxy-rotation/proxy-rotation.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var proxyRotationRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../../../modules/proxy-rotation/repository/proxy-rotation.repository', () => {
  proxyRotationRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1', name: 'default' }], rowCount: 1 }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w', name: 'pool-a' }], rowCount: 1 }),
    getOwned: jest.fn().mockResolvedValue({
      rows: [{ id: 'sid', config: { pool_size: 5, rotation_index: 0 } }],
      rowCount: 1,
    }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-edge' }], rowCount: 1 }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    ProxyRotationRepository: jest.fn().mockImplementation(() => proxyRotationRepo),
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

describe('ProxyRotationModule HTTP routes (edge)', () => {
  let server: http.Server;

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
    proxyRotationRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }], rowCount: 1 });
    proxyRotationRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }], rowCount: 1 });
    proxyRotationRepo.getOwned.mockResolvedValue({
      rows: [{ id: 'sid', config: { pool_size: 5, rotation_index: 0 } }],
      rowCount: 1,
    });
    proxyRotationRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-edge' }], rowCount: 1 });
  });

  it('GET / lists workspaces for the authenticated user', async () => {
    const res = await request(server).get('/proxy-rotation');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([{ id: 'w1' }]);
    expect(proxyRotationRepo.listByUser).toHaveBeenCalledWith('u1');
  });

  it('POST / creates a workspace with validated body', async () => {
    const res = await request(server).post('/proxy-rotation/').send({ name: 'prod-pool', budgetAllocated: 100, poolSize: 8 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(proxyRotationRepo.create).toHaveBeenCalledWith('u1', 'prod-pool', 100, 8);
  });

  it('POST / returns validation error when name is too short', async () => {
    const res = await request(server).post('/proxy-rotation/').send({ name: 'ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.create).not.toHaveBeenCalled();
  });

  it('POST /:id/run returns validation error for invalid workspace id in params', async () => {
    const res = await request(server).post('/proxy-rotation/bad%20id/run').send({ mode: 'rotate', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /:id/run returns validation error when intensity is below minimum', async () => {
    const res = await request(server).post('/proxy-rotation/ws-01/run').send({ mode: 'rotate', intensity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('returns 401 when authenticate rejects', async () => {
    authEnabled = false;
    const res = await request(server).get('/proxy-rotation/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
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
      .post('/proxy-rotation/')
      .set(adminHdr)
      .send({ name: 'prod-pool', budgetAllocated: 100, poolSize: 8 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(proxyRotationRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/proxy-rotation/ws-01/run')
      .set(adminHdr)
      .send({ mode: 'rotate', intensity: 10 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(proxyRotationRepo.getOwned).not.toHaveBeenCalled();
  });
});
