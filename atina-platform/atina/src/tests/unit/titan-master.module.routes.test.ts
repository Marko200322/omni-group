import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { TitanMasterModule } from '../../modules/titan-master/titan-master.module';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false, fetchRecommendations: jest.fn() }),
  getCommsClient: () => ({ isConfigured: () => false, request: jest.fn() }),
}));

jest.mock('../../modules/autonomy-loop/service/autonomy-orchestrator.service', () => ({
  AutonomyOrchestratorService: jest.fn().mockImplementation(() => ({
    expandFromTitanMaster: jest.fn().mockResolvedValue({ status: 'skipped' }),
  })),
}));

jest.mock('../../database/connection');

let titanMasterAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => {
  const errors = jest.requireActual<typeof import('../../utils/errors')>('../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!titanMasterAuthOn) {
        throw new errors.AuthenticationError('No authentication token provided');
      }
      const role = (req.headers['x-test-role'] as string) || 'user';
      (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
        userId: 'u1',
        role,
        email: 'u@test.com',
      };
      next();
    },
    requireAdmin: (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const u = (req as express.Request & { user?: { role: string } }).user;
      if (u?.role !== 'admin') {
        return res.status(403).json({ success: false });
      }
      next();
    },
  };
});

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

function runThree(id: string) {
  return mockQuery
    .mockResolvedValueOnce({ rows: [{ id }], rowCount: 1 } as never)
    .mockResolvedValueOnce({ rows: [{ id: 'run' }], rowCount: 1 } as never)
    .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
}

describe('TitanMasterModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new TitanMasterModule();
    await m.initialize();
    app.use('/titan-master', m.router);
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
    titanMasterAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /titan-master lists systems', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 't1' }], rowCount: 1 } as never);
    expect((await request(server).get('/titan-master')).status).toBe(200);
  });

  it('POST /titan-master creates', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'new' }], rowCount: 1 } as never);
    const res = await request(server)
      .post('/titan-master')
      .send({ name: 'Sys', objective: 'Grow revenue', budgetAllocated: 10 });

    expect(res.status).toBe(201);
    const cfg = JSON.parse((mockQuery.mock.calls[0][1] as unknown[])[4] as string);
    expect(cfg.objective).toBe('Grow revenue');
  });

  it('POST /titan-master rejects unknown fields', async () => {
    const res = await request(server)
      .post('/titan-master')
      .send({ name: 'Sys', objective: 'Grow revenue', budgetAllocated: 10, extra: 'nope' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it.each([
    ['optimize', 150],
    ['expand', 250],
    ['stabilize', 80],
  ] as const)('POST /titan-master/:id/run mode %s', async (mode, gain) => {
    runThree('tid');
    const res = await request(server).post('/titan-master/tid/run').send({ mode, input: { x: 1 } });
    expect(res.status).toBe(200);
    const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[3] as string);
    expect(out.projected_gain).toBe(gain);
    expect(out.audit).toEqual(
      expect.objectContaining({
        normalized: true,
        mode,
      })
    );
    expect((mockQuery.mock.calls[1][1] as unknown[])[2]).toBe(JSON.stringify({ x: 1 }));
  });

  it('GET /titan-master/admin/overview 403 for user', async () => {
    expect((await request(server).get('/titan-master/admin/overview')).status).toBe(403);
  });

  it('GET /titan-master/admin/overview for admin', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ systems: 2, revenue: '100', avg_efficiency: '50' }],
      rowCount: 1,
    } as never);

    const res = await request(server).get('/titan-master/admin/overview').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.data.systems).toBe(2);
  });

  it('POST /titan-master/:id/run 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    expect((await request(server).post('/titan-master/x/run').send({})).status).toBe(404);
  });

  it('GET /titan-master returns 400 when query params are present', async () => {
    const res = await request(server).get('/titan-master').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /titan-master returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/titan-master').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /titan-master returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/titan-master')
      .query({ draft: '1' })
      .send({ name: 'Sys', objective: 'Grow revenue', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /titan-master/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/titan-master/tid/run')
      .query({ sync: '1' })
      .send({ mode: 'optimize', input: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /titan-master/admin/overview returns 400 when query params are present', async () => {
    const res = await request(server).get('/titan-master/admin/overview').set('x-test-role', 'admin').query({ x: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /titan-master/admin/overview returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/titan-master/admin/overview').set('x-test-role', 'admin').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /titan-master/:id/run returns 400 when input is not an object record', async () => {
    const res = await request(server).post('/titan-master/tid/run').send({ mode: 'expand', input: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /titan-master', async () => {
    titanMasterAuthOn = false;
    const res = await request(server).get('/titan-master');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /titan-master', async () => {
    titanMasterAuthOn = false;
    const res = await request(server)
      .post('/titan-master')
      .send({ name: 'Sys', objective: 'Grow revenue', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /titan-master/:id/run', async () => {
    titanMasterAuthOn = false;
    const res = await request(server)
      .post('/titan-master/tid/run')
      .send({ mode: 'optimize', input: { x: 1 } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated user titan-master routes even with x-test-role admin header', async () => {
    titanMasterAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/titan-master').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server)
      .post('/titan-master')
      .set(adminHdr)
      .send({ name: 'Sys', objective: 'Grow revenue', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server)
      .post('/titan-master/tid/run')
      .set(adminHdr)
      .send({ mode: 'optimize', input: { x: 1 } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /titan-master/admin/overview even with x-test-role admin header', async () => {
    titanMasterAuthOn = false;
    const res = await request(server).get('/titan-master/admin/overview').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
