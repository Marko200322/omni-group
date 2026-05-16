import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { TitanisModule } from '../../modules/titanis/titanis.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var titanisRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
  auditWorkspaceCreated: jest.Mock;
  auditRunCompleted: jest.Mock;
};

jest.mock('../../modules/titanis/repository/titanis.repository', () => {
  titanisRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({
      rows: [{ id: 'sid', config: { outreach_channel: 'email' } }],
      rowCount: 1,
    }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
    auditWorkspaceCreated: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    auditRunCompleted: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
  };
  return {
    TitanisRepository: jest.fn().mockImplementation(() => titanisRepo),
  };
});

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
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

describe('TitanisModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new TitanisModule();
    await m.initialize();
    app.use('/titanis', m.router);
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
    titanisRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    titanisRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    titanisRepo.getOwned.mockResolvedValue({
      rows: [{ id: 'sid', config: { outreach_channel: 'email' } }],
      rowCount: 1,
    });
    titanisRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    titanisRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
    titanisRepo.auditWorkspaceCreated.mockResolvedValue({ rows: [], rowCount: 0 });
    titanisRepo.auditRunCompleted.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  it('GET /titanis lists workspaces', async () => {
    const res = await request(server).get('/titanis');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'w1' }]);
  });

  it('POST /titanis creates workspace', async () => {
    const res = await request(server).post('/titanis').send({ name: 'Sales' });
    expect(res.status).toBe(201);
    expect(titanisRepo.create).toHaveBeenCalledWith('u1', 'Sales', 0, 'mixed');
  });

  it('POST /titanis/:id/run', async () => {
    const res = await request(server).post('/titanis/sid/run').send({ mode: 'lead-hunt', targetCount: 30 });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('run-http');
  });

  it('POST /titanis/:id/run 404 when not found', async () => {
    titanisRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/titanis/xx/run').send({});
    expect(res.status).toBe(404);
  });

  it('POST /titanis/:id/run rejects invalid id format', async () => {
    const res = await request(server).post('/titanis/!!!/run').send({ mode: 'lead-hunt', targetCount: 5 });
    expect(res.status).toBe(400);
  });

  it('POST /titanis/:id/run returns 500 when run row cannot be persisted', async () => {
    titanisRepo.createRun.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/titanis/sid/run').send({ mode: 'lead-hunt', targetCount: 10 });
    expect(res.status).toBe(500);
    expect(res.body.error?.code).toBe('TITANIS_RUN_PERSIST_FAILED');
  });

  it('POST /titanis/:id/run rejects targetCount below minimum', async () => {
    const bad = await request(server).post('/titanis/sid/run').send({ mode: 'lead-hunt', targetCount: 0 });
    expect(bad.status).toBe(400);
  });

  it('GET /titanis returns 400 when query params are present', async () => {
    const res = await request(server).get('/titanis').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanisRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /titanis returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/titanis').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanisRepo.listByUser).not.toHaveBeenCalled();
  });

  it('POST /titanis returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/titanis')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanisRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titanis creates workspace with outreachChannel', async () => {
    const res = await request(server).post('/titanis').send({
      name: 'Outreach ws',
      budgetAllocated: 5,
      outreachChannel: 'email',
    });
    expect(res.status).toBe(201);
    expect(titanisRepo.create).toHaveBeenCalledWith('u1', 'Outreach ws', 5, 'email');
  });

  it('POST /titanis returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/titanis').send({ name: 'Good name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanisRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titanis returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/titanis').send({ name: 'Ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanisRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titanis returns 400 when outreachChannel is invalid', async () => {
    const res = await request(server).post('/titanis').send({ name: 'Good name', outreachChannel: 'fax' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanisRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titanis/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/titanis/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'lead-hunt', targetCount: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanisRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /titanis/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/titanis/sid/run')
      .send({ mode: 'follow-up', targetCount: 10, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanisRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /titanis/:id/run returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/titanis/sid/run').send({ mode: 'blast', targetCount: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanisRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /titanis', async () => {
    authEnabled = false;
    const res = await request(server).get('/titanis');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanisRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /titanis', async () => {
    authEnabled = false;
    const res = await request(server).post('/titanis').send({ name: 'No auth', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanisRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /titanis/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/titanis/sid/run').send({ mode: 'lead-hunt', targetCount: 30 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanisRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated titanis routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/titanis').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanisRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server)
      .post('/titanis')
      .set(adminHdr)
      .send({ name: 'No auth', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanisRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/titanis/sid/run')
      .set(adminHdr)
      .send({ mode: 'lead-hunt', targetCount: 30 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanisRepo.getOwned).not.toHaveBeenCalled();
  });
});
