import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { FollowUpModule } from '../../../../modules/follow-up/follow-up.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var followUpRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../../../modules/follow-up/repository/follow-up.repository', () => {
  followUpRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    FollowUpRepository: jest.fn().mockImplementation(() => followUpRepo),
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

describe('FollowUpModule HTTP routes', () => {
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
    const m = new FollowUpModule();
    await m.initialize();
    app.use('/follow-up', m.router);
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
    followUpRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    followUpRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    followUpRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    followUpRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    followUpRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('GET lists workspaces', async () => {
    const res = await request(server).get('/follow-up');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
  });

  it('GET /status returns shape', async () => {
    const res = await request(server).get('/follow-up/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('cadences');
  });

  it('POST /:id/run', async () => {
    const res = await request(server).post('/follow-up/sid/run').send({ mode: 'schedule', intensity: 30 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(followUpRepo.createRun).toHaveBeenCalled();
  });

  it('POST /:id/run 404 when not found', async () => {
    followUpRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/follow-up/xx/run').send({ mode: 'digest', intensity: 20 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /follow-up returns 400 when query params are present', async () => {
    const res = await request(server).get('/follow-up').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /follow-up returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/follow-up').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /follow-up/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/follow-up/status').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /follow-up/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/follow-up/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /follow-up creates workspace with valid body', async () => {
    const res = await request(server).post('/follow-up').send({
      name: 'Follow workspace',
      budgetAllocated: 500,
      cadencePreset: 'light',
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(followUpRepo.create).toHaveBeenCalledWith('u1', 'Follow workspace', 500, 'light');
  });

  it('POST /follow-up returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/follow-up')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.create).not.toHaveBeenCalled();
  });

  it('POST /follow-up returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/follow-up').send({ name: 'Good name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.create).not.toHaveBeenCalled();
  });

  it('POST /follow-up returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/follow-up').send({ name: 'Ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.create).not.toHaveBeenCalled();
  });

  it('POST /follow-up returns 400 when cadencePreset is invalid', async () => {
    const res = await request(server).post('/follow-up').send({ name: 'Good name', cadencePreset: 'turbo' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.create).not.toHaveBeenCalled();
  });

  it('POST /follow-up/:id/run returns 400 when workspace id format invalid', async () => {
    const res = await request(server).post('/follow-up/bad!!!/run').send({ mode: 'schedule', intensity: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /follow-up/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/follow-up/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'schedule', intensity: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /follow-up/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/follow-up/sid/run')
      .send({ mode: 'digest', intensity: 20, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /follow-up/:id/run returns 400 when intensity is out of range', async () => {
    const res = await request(server).post('/follow-up/sid/run').send({ mode: 'schedule', intensity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /follow-up/:id/run returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/follow-up/sid/run').send({ mode: 'blast', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /follow-up/:id/run returns 400 when revenueEstimate is not positive', async () => {
    const res = await request(server)
      .post('/follow-up/sid/run')
      .send({ mode: 'escalate', intensity: 50, revenueEstimate: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(followUpRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /follow-up', async () => {
    authEnabled = false;
    const res = await request(server).get('/follow-up');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /follow-up/status', async () => {
    authEnabled = false;
    const res = await request(server).get('/follow-up/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated POST /follow-up', async () => {
    authEnabled = false;
    const res = await request(server).post('/follow-up').send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /follow-up/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/follow-up/sid/run').send({ mode: 'schedule', intensity: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated follow-up routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/follow-up').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server).get('/follow-up/status').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');

    res = await request(server)
      .post('/follow-up')
      .set(adminHdr)
      .send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/follow-up/sid/run')
      .set(adminHdr)
      .send({ mode: 'schedule', intensity: 20 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(followUpRepo.getOwned).not.toHaveBeenCalled();
  });
});
