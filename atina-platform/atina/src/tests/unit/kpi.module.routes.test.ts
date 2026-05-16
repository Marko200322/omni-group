import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { KpiModule } from '../../modules/kpi/kpi.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

jest.mock('../../database/connection');

let kpiAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!kpiAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    const role = (req.headers['x-test-role'] as string) || 'admin';
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
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('KpiModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new KpiModule();
    await m.initialize();
    app.use('/kpi', m.router);
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
    kpiAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /kpi/dashboard returns 403 for non-admin', async () => {
    const res = await request(server).get('/kpi/dashboard').set('x-test-role', 'user');
    expect(res.status).toBe(403);
  });

  it('GET /kpi/dashboard returns 400 when JSON body has unknown keys', async () => {
    const res = await request(server)
      .get('/kpi/dashboard')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ filter: 'all' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /kpi/dashboard returns aggregated KPIs', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ c: '10' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ c: '3' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ s: '99.5' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ c: '2' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ c: '1' }], rowCount: 1 } as never);

    const res = await request(server).get('/kpi/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      activeUsers: 10,
      activeSubscriptions: 3,
      totalRevenue: 99.5,
      activeTasks: 2,
      activeEcosystemSystems: 1,
    });
  });

  it('GET /kpi/dashboard returns 400 when query params are present', async () => {
    const res = await request(server).get('/kpi/dashboard').query({ range: '7d' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /kpi/dashboard', async () => {
    kpiAuthOn = false;
    const res = await request(server).get('/kpi/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /kpi/dashboard even with x-test-role admin header', async () => {
    kpiAuthOn = false;
    const res = await request(server).get('/kpi/dashboard').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
