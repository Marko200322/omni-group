import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { FollowUpAutomationModule } from '../../../../modules/follow-up-automation/follow-up-automation.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var followUpAutomationRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../../../modules/follow-up-automation/repository/follow-up-automation.repository', () => {
  followUpAutomationRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    FollowUpAutomationRepository: jest.fn().mockImplementation(() => followUpAutomationRepo),
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

describe('FollowUpAutomationModule HTTP routes', () => {
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
    const m = new FollowUpAutomationModule();
    await m.initialize();
    app.use('/follow-up-automation', m.router);
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
    followUpAutomationRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    followUpAutomationRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    followUpAutomationRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    followUpAutomationRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    followUpAutomationRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('GET lists workspaces', async () => {
    const res = await request(server).get('/follow-up-automation');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
  });

  it('GET /status returns shape', async () => {
    const res = await request(server).get('/follow-up-automation/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('strategies');
  });

  it('POST /:id/run with mode schedule', async () => {
    const res = await request(server).post('/follow-up-automation/sid/run').send({ mode: 'schedule', intensity: 30 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(followUpAutomationRepo.createRun).toHaveBeenCalled();
  });

  it('POST /:id/run with mode escalate', async () => {
    const res = await request(server).post('/follow-up-automation/sid/run').send({ mode: 'escalate', intensity: 40 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(followUpAutomationRepo.createRun).toHaveBeenCalled();
  });

  it('POST /:id/run with mode digest', async () => {
    const res = await request(server).post('/follow-up-automation/sid/run').send({ mode: 'digest', intensity: 20 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
  });

  it('POST /:id/run 404 when not found', async () => {
    followUpAutomationRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/follow-up-automation/xx/run').send({ mode: 'schedule', intensity: 20 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST / creates workspace', async () => {
    const res = await request(server).post('/follow-up-automation').send({
      name: 'Follow-up workspace',
      followUpStrategy: 'aggressive',
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(followUpAutomationRepo.create).toHaveBeenCalledWith(
      'u1',
      'Follow-up workspace',
      0,
      'aggressive'
    );
  });

  it('POST / returns 400 when DTO invalid', async () => {
    const res = await request(server).post('/follow-up-automation').send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /:id/run returns 400 for invalid param id', async () => {
    const res = await request(server)
      .post('/follow-up-automation/id.with.dots/run')
      .send({ mode: 'schedule', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /:id/run returns 400 for invalid body', async () => {
    const res = await request(server).post('/follow-up-automation/sid/run').send({ mode: 'schedule', intensity: 200 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /follow-up-automation returns 400 when query params are present', async () => {
    const res = await request(server).get('/follow-up-automation').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /follow-up-automation returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/follow-up-automation').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /follow-up-automation/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/follow-up-automation/status').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /follow-up-automation/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/follow-up-automation/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /follow-up-automation returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/follow-up-automation')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.create).not.toHaveBeenCalled();
  });

  it('POST /follow-up-automation returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/follow-up-automation').send({ name: 'Good name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.create).not.toHaveBeenCalled();
  });

  it('POST /follow-up-automation returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/follow-up-automation').send({ name: 'Ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.create).not.toHaveBeenCalled();
  });

  it('POST /follow-up-automation returns 400 when followUpStrategy is invalid', async () => {
    const res = await request(server).post('/follow-up-automation').send({ name: 'Good name', followUpStrategy: 'turbo' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.create).not.toHaveBeenCalled();
  });

  it('POST /follow-up-automation/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/follow-up-automation/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'schedule', intensity: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /follow-up-automation/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/follow-up-automation/sid/run')
      .send({ mode: 'digest', intensity: 20, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /follow-up-automation/:id/run returns 400 when intensity is out of range (low)', async () => {
    const res = await request(server).post('/follow-up-automation/sid/run').send({ mode: 'schedule', intensity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /follow-up-automation/:id/run returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/follow-up-automation/sid/run').send({ mode: 'blast', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /follow-up-automation/:id/run returns 400 when revenueEstimate is not positive', async () => {
    const res = await request(server)
      .post('/follow-up-automation/sid/run')
      .send({ mode: 'escalate', intensity: 50, revenueEstimate: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpAutomationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /follow-up-automation', async () => {
    authEnabled = false;
    const res = await request(server).get('/follow-up-automation');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpAutomationRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /follow-up-automation/status', async () => {
    authEnabled = false;
    const res = await request(server).get('/follow-up-automation/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated POST /follow-up-automation', async () => {
    authEnabled = false;
    const res = await request(server).post('/follow-up-automation').send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpAutomationRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /follow-up-automation/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/follow-up-automation/sid/run').send({ mode: 'schedule', intensity: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpAutomationRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated follow-up-automation routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/follow-up-automation').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpAutomationRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server).get('/follow-up-automation/status').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');

    res = await request(server)
      .post('/follow-up-automation')
      .set(adminHdr)
      .send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpAutomationRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/follow-up-automation/sid/run')
      .set(adminHdr)
      .send({ mode: 'schedule', intensity: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpAutomationRepo.getOwned).not.toHaveBeenCalled();
  });
});
