import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { SubscriptionsModule } from '../../modules/subscriptions/subscriptions.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError, AuthorizationError } from '../../utils/errors';

jest.mock('../../database/connection');

let subAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!subAuthOn) {
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
      return next(new AuthorizationError());
    }
    next();
  },
}));

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('SubscriptionsModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new SubscriptionsModule();
    await m.initialize();
    app.use('/subscriptions', m.router);
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
    subAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('rejects unauthenticated GET /subscriptions', async () => {
    subAuthOn = false;
    const res = await request(server).get('/subscriptions');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /subscriptions/admin/all', async () => {
    subAuthOn = false;
    const res = await request(server).get('/subscriptions/admin/all').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /subscriptions/current', async () => {
    subAuthOn = false;
    const res = await request(server).get('/subscriptions/current');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /subscriptions/usage', async () => {
    subAuthOn = false;
    const res = await request(server).get('/subscriptions/usage');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it.each([['/subscriptions'], ['/subscriptions/current'], ['/subscriptions/usage']] as const)(
    'rejects unauthenticated GET %s even with x-test-role admin header',
    async (path) => {
      subAuthOn = false;
      const res = await request(server).get(path).set('x-test-role', 'admin');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
      expect(mockQuery).not.toHaveBeenCalled();
    }
  );

  it('GET /subscriptions returns user subscriptions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 's1', plan_name: 'Pro' }], rowCount: 1 } as never);
    const res = await request(server).get('/subscriptions');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([{ id: 's1', plan_name: 'Pro' }]);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM subscriptions s'), ['u1']);
  });

  it('GET /subscriptions returns empty array when user has no subscriptions', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).get('/subscriptions');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('GET /subscriptions/current returns first row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'cur' }], rowCount: 1 } as never);
    const res = await request(server).get('/subscriptions/current');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: 'cur' });
  });

  it('GET /subscriptions/current returns null when no row', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).get('/subscriptions/current');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeNull();
  });

  it('GET /subscriptions/usage aggregates tasks, events and limits', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '12' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ count: '3' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ limits: { tasks_per_month: 100 } }], rowCount: 1 } as never);

    const res = await request(server).get('/subscriptions/usage');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      tasksThisMonth: 12,
      requestsToday: 3,
      limits: { tasks_per_month: 100 },
    });
    const limitsSql = String(mockQuery.mock.calls[2][0]);
    expect(limitsSql).toContain('COALESCE(sub.limits, up.limits)');
    expect(limitsSql).toContain('FROM subscriptions s');
  });

  it('GET /subscriptions/usage uses empty limits when plan row missing', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).get('/subscriptions/usage');
    expect(res.body.data.limits).toEqual({});
  });

  it('GET /subscriptions/admin/all paginates', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'a1' }], rowCount: 1 } as never);

    const res = await request(server)
      .get('/subscriptions/admin/all')
      .set('x-test-role', 'admin')
      .query({ page: 2, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 2, limit: 10, total: 1 });
  });

  it('GET /subscriptions/admin/all defaults page and limit', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).get('/subscriptions/admin/all').set('x-test-role', 'admin');

    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][1]).toEqual([20, 0]);
  });

  it('GET /subscriptions/admin/all uses catch-default page when page is not numeric', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server)
      .get('/subscriptions/admin/all')
      .set('x-test-role', 'admin')
      .query({ page: 'bad' });

    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20 });
    expect(mockQuery.mock.calls[1][1]).toEqual([20, 0]);
  });

  it('GET /subscriptions/admin/all returns 400 when limit exceeds cap', async () => {
    const res = await request(server)
      .get('/subscriptions/admin/all')
      .set('x-test-role', 'admin')
      .query({ limit: 150 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /subscriptions/admin/all returns 400 when limit is non-positive', async () => {
    const res = await request(server)
      .get('/subscriptions/admin/all')
      .set('x-test-role', 'admin')
      .query({ limit: '-1' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /subscriptions/admin/all returns 400 on unknown query keys (strict)', async () => {
    const res = await request(server)
      .get('/subscriptions/admin/all')
      .set('x-test-role', 'admin')
      .query({ page: 1, sort: 'desc' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /subscriptions/admin/all rejects non-admin', async () => {
    const res = await request(server).get('/subscriptions/admin/all');
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'AUTHORIZATION_ERROR' },
    });
  });

  it('GET /subscriptions returns 400 when query params are present', async () => {
    const res = await request(server).get('/subscriptions').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /subscriptions returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/subscriptions').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /subscriptions/current returns 400 when query params are present', async () => {
    const res = await request(server).get('/subscriptions/current').query({ refresh: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /subscriptions/current returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/subscriptions/current').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /subscriptions/usage returns 400 when query params are present', async () => {
    const res = await request(server).get('/subscriptions/usage').query({ v: '2' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /subscriptions/usage returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/subscriptions/usage').send({ force: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /subscriptions/admin/all returns 400 when body is not strictly empty', async () => {
    const res = await request(server)
      .get('/subscriptions/admin/all')
      .set('x-test-role', 'admin')
      .send({ filter: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
