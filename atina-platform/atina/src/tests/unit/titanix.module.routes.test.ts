import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { TitanixModule } from '../../modules/titanix/titanix.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';
import * as queue from '../../queue/queue';

// eslint-disable-next-line no-var
var titanixRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  insertTask: jest.Mock;
  insertRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/titanix/repository/titanix.repository', () => {
  titanixRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    insertTask: jest.fn().mockResolvedValue({ rows: [{ id: 'task-http' }] }),
    insertRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    TitanixRepository: jest.fn().mockImplementation(() => titanixRepo),
  };
});

jest.mock('../../queue/queue', () => ({
  addJob: jest.fn().mockResolvedValue(undefined),
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

const mockAddJob = queue.addJob as jest.MockedFunction<typeof queue.addJob>;

describe('TitanixModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new TitanixModule();
    await m.initialize();
    app.use('/titanix', m.router);
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
    titanixRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    titanixRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    titanixRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    titanixRepo.insertTask.mockResolvedValue({ rows: [{ id: 'task-http' }] });
    titanixRepo.insertRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    titanixRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('GET /titanix lists workspaces', async () => {
    const res = await request(server).get('/titanix');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'w1' }]);
  });

  it('POST /titanix creates workspace', async () => {
    const res = await request(server).post('/titanix').send({ name: 'Wrk', budgetAllocated: 0 });
    expect(res.status).toBe(201);
    expect(titanixRepo.create).toHaveBeenCalled();
  });

  it('POST /titanix/:id/run', async () => {
    const res = await request(server).post('/titanix/sid/run').send({ pipeline: 'ops', jobs: 2 });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('run-http');
    expect(titanixRepo.insertTask).toHaveBeenCalledTimes(2);
    expect(mockAddJob).toHaveBeenCalledTimes(2);
  });

  it('POST /titanix/:id/run 404 when not found', async () => {
    titanixRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/titanix/xx/run').send({ jobs: 1 });
    expect(res.status).toBe(404);
  });

  it('POST /titanix/:id/run rejects invalid id format', async () => {
    const res = await request(server).post('/titanix/!!!/run').send({ pipeline: 'ops', jobs: 1 });
    expect(res.status).toBe(400);
  });

  it('GET /titanix returns 400 when query params are present', async () => {
    const res = await request(server).get('/titanix').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanixRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /titanix returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/titanix').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanixRepo.listByUser).not.toHaveBeenCalled();
  });

  it('POST /titanix returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/titanix')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanixRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titanix returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/titanix').send({ name: 'Good name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanixRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titanix returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/titanix').send({ name: 'Ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanixRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titanix returns 400 when executionProfile is invalid', async () => {
    const res = await request(server).post('/titanix').send({ name: 'Good name', executionProfile: 'wild' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanixRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titanix creates workspace with executionProfile', async () => {
    const res = await request(server).post('/titanix').send({
      name: 'Titanix ws',
      budgetAllocated: 1,
      executionProfile: 'aggressive',
    });
    expect(res.status).toBe(201);
    expect(titanixRepo.create).toHaveBeenCalledWith('u1', 'Titanix ws', 1, 'aggressive');
  });

  it('POST /titanix/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/titanix/sid/run')
      .query({ sync: '1' })
      .send({ pipeline: 'ops', jobs: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanixRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /titanix/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/titanix/sid/run').send({ pipeline: 'content', jobs: 2, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanixRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /titanix/:id/run returns 400 when jobs is below minimum', async () => {
    const res = await request(server).post('/titanix/sid/run').send({ pipeline: 'ops', jobs: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanixRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /titanix/:id/run returns 400 when pipeline is invalid', async () => {
    const res = await request(server).post('/titanix/sid/run').send({ pipeline: 'ml', jobs: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanixRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /titanix', async () => {
    authEnabled = false;
    const res = await request(server).get('/titanix');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanixRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /titanix', async () => {
    authEnabled = false;
    const res = await request(server).post('/titanix').send({ name: 'No auth', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanixRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /titanix/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/titanix/sid/run').send({ pipeline: 'ops', jobs: 2 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanixRepo.getOwned).not.toHaveBeenCalled();
    expect(mockAddJob).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated titanix routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/titanix').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanixRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server)
      .post('/titanix')
      .set(adminHdr)
      .send({ name: 'No auth', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanixRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/titanix/sid/run')
      .set(adminHdr)
      .send({ pipeline: 'ops', jobs: 2 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanixRepo.getOwned).not.toHaveBeenCalled();
    expect(mockAddJob).not.toHaveBeenCalled();
  });
});
