import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { AnalyticsModule } from '../../modules/analytics/analytics.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

jest.mock('../../database/connection');

let analyticsAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!analyticsAuthOn) {
      throw new AuthenticationError('No authentication token provided');
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
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

function emptyAnalyticsRows() {
  return {
    rows: [] as { status?: string; count?: string; date?: string; event_name?: string; total?: string; plan_slug?: string; name?: string; revenue?: string }[],
    rowCount: 0,
  } as never;
}

describe('AnalyticsModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      if (req.headers['x-test-null-ip'] === '1') {
        Object.defineProperty(req.socket, 'remoteAddress', {
          value: undefined,
          configurable: true,
        });
      }
      next();
    });
    const m = new AnalyticsModule();
    await m.initialize();
    app.use('/analytics', m.router);
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
    analyticsAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('rejects unauthenticated POST /analytics/track', async () => {
    analyticsAuthOn = false;
    const res = await request(server).post('/analytics/track').send({ eventName: 'signup' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /analytics/dashboard', async () => {
    analyticsAuthOn = false;
    const res = await request(server).get('/analytics/dashboard');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /analytics/events', async () => {
    analyticsAuthOn = false;
    const res = await request(server).get('/analytics/events');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated non-admin analytics routes even with x-test-role admin header', async () => {
    analyticsAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).post('/analytics/track').set(adminHdr).send({ eventName: 'signup' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).get('/analytics/dashboard').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).get('/analytics/events').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /analytics/admin/overview', async () => {
    analyticsAuthOn = false;
    const res = await request(server).get('/analytics/admin/overview').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /analytics/track returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/analytics/track')
      .query({ batch: '1' })
      .send({ eventName: 'signup' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /analytics/track inserts event', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server)
      .post('/analytics/track')
      .set('user-agent', 'jest')
      .send({ eventName: 'signup', properties: { a: 1 }, sessionId: 'sid-1' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO analytics_events'),
      expect.arrayContaining([
        'u1',
        'signup',
        JSON.stringify({ a: 1 }),
        'sid-1',
        expect.anything(),
        'jest',
      ])
    );
  });

  it('POST /analytics/track uses x-forwarded-for when present', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    await request(server)
      .post('/analytics/track')
      .set('x-forwarded-for', '203.0.113.1')
      .send({ eventName: 'page_view' });

    expect(mockQuery.mock.calls[0][1] as unknown[]).toEqual([
      'u1',
      'page_view',
      '{}',
      null,
      '203.0.113.1',
      null,
    ]);
  });

  it('POST /analytics/track stores first IP from x-forwarded-for chain', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    await request(server)
      .post('/analytics/track')
      .set('x-forwarded-for', '198.51.100.2, 10.0.0.1')
      .send({ eventName: 'page_view' });

    expect((mockQuery.mock.calls[0][1] as unknown[])[4]).toBe('198.51.100.2');
  });

  it('POST /analytics/track uses null ip and user-agent when absent', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    await request(server)
      .post('/analytics/track')
      .set('x-test-null-ip', '1')
      .unset('User-Agent')
      .send({ eventName: 'evt' });

    const args = mockQuery.mock.calls[0][1] as unknown[];
    expect(args[4]).toBeNull();
    expect(args[5]).toBeNull();
  });

  it('GET /analytics/dashboard aggregates with default range and caps at 365 days', async () => {
    mockQuery
      .mockResolvedValueOnce(emptyAnalyticsRows())
      .mockResolvedValueOnce({ rows: [{ id: 't1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce(emptyAnalyticsRows())
      .mockResolvedValueOnce(emptyAnalyticsRows());

    const resDefault = await request(server).get('/analytics/dashboard');
    expect(resDefault.status).toBe(200);
    expect(resDefault.body.data.period).toBe('30 days');
    expect(mockQuery.mock.calls[0][0]).toContain('($2::integer * INTERVAL');
    expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 30]);

    jest.clearAllMocks();
    mockQuery
      .mockResolvedValueOnce(emptyAnalyticsRows())
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce(emptyAnalyticsRows())
      .mockResolvedValueOnce(emptyAnalyticsRows());

    const resBad = await request(server).get('/analytics/dashboard').query({ range: 'not-a-number' });
    expect(resBad.body.data.period).toBe('30 days');

    jest.clearAllMocks();
    mockQuery
      .mockResolvedValueOnce(emptyAnalyticsRows())
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce(emptyAnalyticsRows())
      .mockResolvedValueOnce(emptyAnalyticsRows());

    const resCap = await request(server).get('/analytics/dashboard').query({ range: '999' });
    expect(resCap.body.data.period).toBe('365 days');
    expect(mockQuery.mock.calls[0][0]).toContain('($2::integer * INTERVAL');
    expect(mockQuery.mock.calls[0][1]).toEqual(['u1', 365]);
  });

  it('GET /analytics/dashboard maps task and event stats', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          { status: 'done', count: '3' },
          { status: 'open', count: '1' },
        ],
        rowCount: 2,
      } as never)
      .mockResolvedValueOnce({ rows: [{ id: 't' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({
        rows: [{ date: '2026-01-01', count: '2' }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [{ event_name: 'click', count: '5' }],
        rowCount: 1,
      } as never);

    const res = await request(server).get('/analytics/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.tasks.byStatus).toEqual({ done: 3, open: 1 });
    expect(res.body.data.events.daily[0]).toEqual({ date: '2026-01-01', count: 2 });
    expect(res.body.data.events.top[0]).toEqual({ name: 'click', count: 5 });
  });

  it('GET /analytics/admin/overview requires admin', async () => {
    const res = await request(server).get('/analytics/admin/overview');
    expect(res.status).toBe(403);
  });

  it('GET /analytics/admin/overview returns overview', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ date: '2026-01-01', count: '3' }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [{ date: '2026-01-02', total: '12.5' }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [{ plan_slug: 'pro', count: '2' }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [{ date: '2026-01-03', count: '4' }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({
        rows: [{ name: 'Pro', count: '1', revenue: '10' }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ count: '7' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ total: '99.5' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ count: '4' }], rowCount: 1 } as never);

    const res = await request(server).get('/analytics/admin/overview').set('x-test-role', 'admin');

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toEqual({
      totalUsers: 7,
      totalRevenue: 99.5,
      activeSubscriptions: 4,
    });
    expect(res.body.data.planDistribution).toEqual([{ plan: 'pro', count: 2 }]);
    expect(res.body.data.userGrowth[0]).toEqual({ date: '2026-01-01', count: 3 });
    expect(res.body.data.revenue[0]).toEqual({ date: '2026-01-02', total: 12.5 });
    expect(res.body.data.taskVolume[0]).toEqual({ date: '2026-01-03', count: 4 });
    expect(res.body.data.topPlans[0]).toMatchObject({ name: 'Pro', count: '1', revenue: '10' });
  });

  it('GET /analytics/events lists with pagination defaults', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'e1' }],
      rowCount: 1,
    } as never);

    const res = await request(server).get('/analytics/events');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'e1' }]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('OFFSET'), ['u1', 50, 0]);
  });

  it('GET /analytics/events accepts custom page and limit', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).get('/analytics/events').query({ page: '2', limit: '10' });
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('OFFSET'), ['u1', 10, 10]);
  });

  it('GET /analytics/events returns 400 when page is invalid', async () => {
    const res = await request(server).get('/analytics/events').query({ page: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /analytics/events returns 400 when limit exceeds max', async () => {
    const res = await request(server).get('/analytics/events').query({ limit: '200' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /analytics/track returns 400 when eventName empty', async () => {
    const res = await request(server).post('/analytics/track').send({ eventName: '' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /analytics/track returns 400 when eventName too long', async () => {
    const res = await request(server)
      .post('/analytics/track')
      .send({ eventName: 'x'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /analytics/track returns 400 VALIDATION_ERROR when body has unknown keys', async () => {
    const res = await request(server)
      .post('/analytics/track')
      .send({ eventName: 'ok', unknownFlag: true });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /analytics/dashboard returns 400 VALIDATION_ERROR when unknown query key is present', async () => {
    const res = await request(server).get('/analytics/dashboard').query({ range: '30', extra: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /analytics/events returns 400 VALIDATION_ERROR when unknown query key is present', async () => {
    const res = await request(server).get('/analytics/events').query({ page: '1', limit: '10', foo: 'bar' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /analytics/dashboard returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/analytics/dashboard').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /analytics/events returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/analytics/events').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /analytics/events returns 400 when limit is non-positive', async () => {
    const res = await request(server).get('/analytics/events').query({ limit: '0' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /analytics/events returns 400 when page is not coercible to a valid integer', async () => {
    const res = await request(server).get('/analytics/events').query({ page: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /analytics/events returns 400 when limit is not coercible to a valid integer', async () => {
    const res = await request(server).get('/analytics/events').query({ limit: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /analytics/admin/overview returns 400 when query params are present', async () => {
    const res = await request(server).get('/analytics/admin/overview').set('x-test-role', 'admin').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /analytics/admin/overview returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/analytics/admin/overview').set('x-test-role', 'admin').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
