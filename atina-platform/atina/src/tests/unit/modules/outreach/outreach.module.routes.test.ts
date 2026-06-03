import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { OutreachModule } from '../../../../modules/outreach/outreach.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var outreachRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../../../modules/outreach/repository/outreach.repository', () => {
  outreachRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    OutreachRepository: jest.fn().mockImplementation(() => outreachRepo),
  };
});

jest.mock('../../../../integrations', () => ({
  getCommsClient: () => ({ isConfigured: () => false, request: jest.fn() }),
}));

let authEnabled = true;
jest.mock('../../../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

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

describe('OutreachModule HTTP routes — modules/outreach', () => {
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
    const m = new OutreachModule();
    await m.initialize();
    app.use('/outreach', m.router);
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
    outreachRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    outreachRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    outreachRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    outreachRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    outreachRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('GET lists workspaces', async () => {
    const res = await request(server).get('/outreach');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
  });

  it('GET /status returns shape', async () => {
    const res = await request(server).get('/outreach/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('channels');
    expect(res.body.data).toHaveProperty('dailyCap');
  });

  it('POST /:id/run', async () => {
    const res = await request(server).post('/outreach/sid/run').send({ mode: 'send', intensity: 30 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(outreachRepo.createRun).toHaveBeenCalled();
  });

  it('POST /:id/run 404 when not found', async () => {
    outreachRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/outreach/xx/run').send({ mode: 'send', intensity: 20 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /outreach returns 400 when query params are present', async () => {
    const res = await request(server).get('/outreach').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /outreach returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/outreach').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /outreach/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/outreach/status').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /outreach/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/outreach/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /outreach creates workspace with valid body', async () => {
    const res = await request(server).post('/outreach').send({
      name: 'Outreach workspace',
      budgetAllocated: 100,
      channelFocus: 'linkedin',
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(outreachRepo.create).toHaveBeenCalledWith('u1', 'Outreach workspace', 100, 'linkedin');
  });

  it('POST /outreach returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/outreach')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.create).not.toHaveBeenCalled();
  });

  it('POST /outreach returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/outreach').send({ name: 'Good name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.create).not.toHaveBeenCalled();
  });

  it('POST /outreach returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/outreach').send({ name: 'Ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.create).not.toHaveBeenCalled();
  });

  it('POST /outreach returns 400 when channelFocus is invalid', async () => {
    const res = await request(server).post('/outreach').send({ name: 'Good name', channelFocus: 'fax' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.create).not.toHaveBeenCalled();
  });

  it('POST /outreach/:id/run returns 400 when workspace id format invalid', async () => {
    const res = await request(server).post('/outreach/bad!!!/run').send({ mode: 'send', intensity: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /outreach/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/outreach/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'send', intensity: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /outreach/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/outreach/sid/run').send({ mode: 'sequence', intensity: 20, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /outreach/:id/run returns 400 when intensity is out of range', async () => {
    const res = await request(server).post('/outreach/sid/run').send({ mode: 'send', intensity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /outreach/:id/run returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/outreach/sid/run').send({ mode: 'blast', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /outreach/:id/run returns 400 when revenueEstimate is not positive', async () => {
    const res = await request(server)
      .post('/outreach/sid/run')
      .send({ mode: 'ab-test', intensity: 50, revenueEstimate: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(outreachRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /outreach', async () => {
    authEnabled = false;
    const res = await request(server).get('/outreach');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(outreachRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /outreach/status', async () => {
    authEnabled = false;
    const res = await request(server).get('/outreach/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated POST /outreach', async () => {
    authEnabled = false;
    const res = await request(server).post('/outreach').send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(outreachRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /outreach/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/outreach/sid/run').send({ mode: 'send', intensity: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(outreachRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated outreach routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/outreach').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(outreachRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server).get('/outreach/status').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');

    res = await request(server)
      .post('/outreach')
      .set(adminHdr)
      .send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(outreachRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/outreach/sid/run')
      .set(adminHdr)
      .send({ mode: 'send', intensity: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(outreachRepo.getOwned).not.toHaveBeenCalled();
  });
});
