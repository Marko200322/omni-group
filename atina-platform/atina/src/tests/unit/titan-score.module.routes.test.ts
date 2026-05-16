import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { TitanScoreModule } from '../../modules/titan-score/titan-score.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var titanScoreRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/titan-score/repository/titan-score.repository', () => {
  titanScoreRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    TitanScoreRepository: jest.fn().mockImplementation(() => titanScoreRepo),
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

describe('TitanScoreModule HTTP routes', () => {
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
    const m = new TitanScoreModule();
    await m.initialize();
    app.use('/titan-score', m.router);
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
    titanScoreRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    titanScoreRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    titanScoreRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    titanScoreRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
  });

  it('GET lists workspaces', async () => {
    const res = await request(server).get('/titan-score');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
  });

  it('GET /status', async () => {
    const res = await request(server).get('/titan-score/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('modes');
  });

  it('POST /:id/run snapshot', async () => {
    const res = await request(server).post('/titan-score/sid/run').send({ mode: 'snapshot', payload: { n: 1 } });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(titanScoreRepo.createRun).toHaveBeenCalled();
  });

  it('POST /:id/run empty body defaults to snapshot', async () => {
    const res = await request(server).post('/titan-score/sid/run').send({});
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(titanScoreRepo.createRun).toHaveBeenCalled();
  });

  it('POST /:id/run 404 when not found', async () => {
    titanScoreRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/titan-score/xx/run').send({ mode: 'snapshot' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /titan-score returns 400 when query params are present', async () => {
    const res = await request(server).get('/titan-score').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /titan-score returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/titan-score').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /titan-score/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/titan-score/status').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /titan-score/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/titan-score/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /titan-score creates workspace with valid body', async () => {
    const res = await request(server).post('/titan-score').send({
      name: 'TS workspace',
      budgetAllocated: 99,
      weightProfile: 'growth',
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(titanScoreRepo.create).toHaveBeenCalledWith('u1', 'TS workspace', 99, 'growth');
  });

  it('POST /titan-score returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/titan-score')
      .query({ draft: '1' })
      .send({ name: 'Ok name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titan-score returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/titan-score').send({ name: 'Ok name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titan-score returns 400 when name is shorter than minimum (2)', async () => {
    const res = await request(server).post('/titan-score').send({ name: 'A', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titan-score returns 400 when weightProfile is invalid', async () => {
    const res = await request(server).post('/titan-score').send({ name: 'Ok', weightProfile: 'turbo' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.create).not.toHaveBeenCalled();
  });

  it('POST /titan-score/:id/run returns 400 when workspace id format invalid', async () => {
    const res = await request(server).post('/titan-score/bad!!!/run').send({ mode: 'snapshot' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /titan-score/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/titan-score/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'snapshot' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /titan-score/:id/run returns 400 on unknown keys for snapshot mode (strict)', async () => {
    const res = await request(server).post('/titan-score/sid/run').send({ mode: 'snapshot', leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /titan-score/:id/run returns 400 when mode is not in union', async () => {
    const res = await request(server).post('/titan-score/sid/run').send({ mode: 'blast' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /titan-score/:id/run returns 400 when trend points array is empty', async () => {
    const res = await request(server).post('/titan-score/sid/run').send({ mode: 'trend', points: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanScoreRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /titan-score', async () => {
    authEnabled = false;
    const res = await request(server).get('/titan-score');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanScoreRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /titan-score/status', async () => {
    authEnabled = false;
    const res = await request(server).get('/titan-score/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated POST /titan-score', async () => {
    authEnabled = false;
    const res = await request(server).post('/titan-score').send({ name: 'No', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanScoreRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /titan-score/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/titan-score/sid/run').send({ mode: 'snapshot', payload: { n: 1 } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanScoreRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated titan-score routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/titan-score').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanScoreRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server).get('/titan-score/status').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');

    res = await request(server)
      .post('/titan-score')
      .set(adminHdr)
      .send({ name: 'No', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanScoreRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/titan-score/sid/run')
      .set(adminHdr)
      .send({ mode: 'snapshot', payload: { n: 1 } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanScoreRepo.getOwned).not.toHaveBeenCalled();
  });
});
