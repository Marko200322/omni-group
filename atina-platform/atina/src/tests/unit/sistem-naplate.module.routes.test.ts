import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { SistemNaplateModule } from '../../modules/sistem-naplate/sistem-naplate.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var sistemNaplateRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/sistem-naplate/repository/sistem-naplate.repository', () => {
  sistemNaplateRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    SistemNaplateRepository: jest.fn().mockImplementation(() => sistemNaplateRepo),
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

describe('SistemNaplateModule HTTP routes', () => {
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
    const m = new SistemNaplateModule();
    await m.initialize();
    app.use('/sistem-naplate', m.router);
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
    sistemNaplateRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    sistemNaplateRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    sistemNaplateRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    sistemNaplateRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    sistemNaplateRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('GET /sistem-naplate lists workspaces', async () => {
    const res = await request(server).get('/sistem-naplate');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toEqual([{ id: 'w1' }]);
  });

  it('POST /sistem-naplate creates workspace', async () => {
    const res = await request(server).post('/sistem-naplate').send({ name: 'Naplata' });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(sistemNaplateRepo.create).toHaveBeenCalled();
  });

  it('POST /sistem-naplate/:id/run', async () => {
    const res = await request(server).post('/sistem-naplate/sid/run').send({ mode: 'invoice', batchSize: 30 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data.id).toBe('run-http');
  });

  it('POST /sistem-naplate/:id/run accepts workflow mode alias billing-cycle (N3-E2)', async () => {
    const res = await request(server).post('/sistem-naplate/sid/run').send({ mode: 'billing-cycle', batchSize: 25 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(sistemNaplateRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'sistem_naplate_reconcile',
      expect.objectContaining({ mode: 'reconcile', batch_size: 25 })
    );
  });

  it('POST /sistem-naplate/:id/run 404 when not found', async () => {
    sistemNaplateRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/sistem-naplate/xx/run').send({ mode: 'invoice', batchSize: 20 });
    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('Sistem naplate workspace (xx) not found');
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.details).toBeUndefined();
  });

  it('POST /sistem-naplate/:id/run returns 500 when run insert returns no row', async () => {
    sistemNaplateRepo.createRun.mockResolvedValueOnce({ rows: [] });
    const res = await request(server).post('/sistem-naplate/sid/run').send({ mode: 'reconcile', batchSize: 15 });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SISTEM_NAPLATE_RUN_PERSIST_FAILED');
    expect(res.body.error.message).toContain('Failed to persist sistem naplate run');
    expect(sistemNaplateRepo.updateAfterRun).not.toHaveBeenCalled();
  });

  it('POST /sistem-naplate returns 500 when create insert returns no row', async () => {
    sistemNaplateRepo.create.mockResolvedValueOnce({ rows: [] });
    const res = await request(server)
      .post('/sistem-naplate')
      .send({ name: 'Valid Workspace', budgetAllocated: 0, billingCadence: 'weekly' });
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('SISTEM_NAPLATE_CREATE_FAILED');
    expect(res.body.error.message).toContain('Failed to create sistem naplate workspace');
  });

  it('POST /sistem-naplate returns 400 for invalid body', async () => {
    const res = await request(server).post('/sistem-naplate').send({ name: 'ab', budgetAllocated: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details[0]).toMatchObject({
      field: expect.any(String),
      message: expect.any(String),
      code: expect.any(String),
    });
  });

  it('POST /sistem-naplate/:id/run returns 400 for invalid run payload', async () => {
    const res = await request(server).post('/sistem-naplate/sid/run').send({ mode: 'invalid', batchSize: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Validation failed');
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /sistem-naplate/:id/run returns 400 for invalid id param', async () => {
    const res = await request(server)
      .post('/sistem-naplate/invalid id!/run')
      .send({ mode: 'invoice', batchSize: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(sistemNaplateRepo.getOwned).not.toHaveBeenCalled();
  });

  it('GET /sistem-naplate returns 401 when unauthenticated', async () => {
    authEnabled = false;
    const res = await request(server).get('/sistem-naplate');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(sistemNaplateRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /sistem-naplate returns 401 when unauthenticated even with x-test-role admin header', async () => {
    authEnabled = false;
    const res = await request(server).get('/sistem-naplate').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(sistemNaplateRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /sistem-naplate returns 400 when query params are present', async () => {
    const res = await request(server).get('/sistem-naplate').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(sistemNaplateRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /sistem-naplate returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/sistem-naplate').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(sistemNaplateRepo.listByUser).not.toHaveBeenCalled();
  });

  it('POST /sistem-naplate returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/sistem-naplate')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(sistemNaplateRepo.create).not.toHaveBeenCalled();
  });

  it('POST /sistem-naplate creates workspace with billingCadence', async () => {
    const res = await request(server).post('/sistem-naplate').send({
      name: 'Billing ws',
      budgetAllocated: 1,
      billingCadence: 'daily',
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(sistemNaplateRepo.create).toHaveBeenCalledWith('u1', 'Billing ws', 1, 'daily');
  });

  it('POST /sistem-naplate returns 400 when billingCadence is invalid', async () => {
    const res = await request(server).post('/sistem-naplate').send({ name: 'Good name', billingCadence: 'yearly' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(sistemNaplateRepo.create).not.toHaveBeenCalled();
  });

  it('POST /sistem-naplate returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/sistem-naplate').send({ name: 'Good name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(sistemNaplateRepo.create).not.toHaveBeenCalled();
  });

  it('POST /sistem-naplate/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/sistem-naplate/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'invoice', batchSize: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(sistemNaplateRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /sistem-naplate/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/sistem-naplate/sid/run')
      .send({ mode: 'settlement', batchSize: 10, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(sistemNaplateRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /sistem-naplate', async () => {
    authEnabled = false;
    const res = await request(server).post('/sistem-naplate').send({ name: 'No session', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(sistemNaplateRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /sistem-naplate/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/sistem-naplate/sid/run').send({ mode: 'invoice', batchSize: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(sistemNaplateRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /sistem-naplate routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server)
      .post('/sistem-naplate')
      .set(adminHdr)
      .send({ name: 'No session', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(sistemNaplateRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/sistem-naplate/sid/run')
      .set(adminHdr)
      .send({ mode: 'invoice', batchSize: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(sistemNaplateRepo.getOwned).not.toHaveBeenCalled();
  });
});
