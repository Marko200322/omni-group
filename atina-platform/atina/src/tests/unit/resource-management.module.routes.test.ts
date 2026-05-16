import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { ResourceManagementModule } from '../../modules/resource-management/resource-management.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

jest.mock('../../database/connection');

let rmAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!rmAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    const role = (req.headers['x-test-role'] as string) || 'admin';
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'admin1',
      role,
      email: 'a@test.com',
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

describe('ResourceManagementModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new ResourceManagementModule();
    await m.initialize();
    app.use('/rm', m.router);
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
    rmAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /rm/overview 403 for non-admin', async () => {
    const res = await request(server).get('/rm/overview').set('x-test-role', 'user');
    expect(res.status).toBe(403);
  });

  it('GET /rm/overview computes ROI when budget > 0', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '100' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ total: '50' }], rowCount: 1 } as never);

    const res = await request(server).get('/rm/overview');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      budgetAllocated: 100,
      realizedRevenue: 50,
      roi: 50,
    });
  });

  it('GET /rm/overview ROI is 0 when no budget allocated', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '0' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ total: '99' }], rowCount: 1 } as never);

    const res = await request(server).get('/rm/overview');
    expect(res.status).toBe(200);
    expect(res.body.data.roi).toBe(0);
  });

  it('POST /rm/allocate updates and logs', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 's1', system_slug: 'craftor', name: 'C', budget_allocated: 500 }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server)
      .post('/rm/allocate')
      .send({ systemSlug: 'craftor', amount: 25, reason: 'Q1 push' });

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      allocations: [{ id: 's1', system_slug: 'craftor', name: 'C', budget_allocated: 500 }],
      updatedCount: 1,
    });
    expect(mockQuery.mock.calls[0][0]).toContain('AND user_id = $3');
    expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO logs');
    expect((mockQuery.mock.calls[1][1] as unknown[])[0]).toBe('admin1');
  });

  it('POST /rm/allocate creates ecosystem row then applies budget when none exists', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({
        rows: [{ id: 'new1', system_slug: 'craftor', name: 'craftor', budget_allocated: 25 }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server)
      .post('/rm/allocate')
      .send({ systemSlug: 'craftor', amount: 25, reason: 'Q1 push' });

    expect(res.status).toBe(201);
    expect(mockQuery.mock.calls[1][0]).toContain('INSERT INTO ecosystem_systems');
    expect((mockQuery.mock.calls[1][1] as unknown[])[0]).toBe('admin1');
    expect(mockQuery.mock.calls[2][0]).toContain('UPDATE ecosystem_systems');
    expect(res.body.data.updatedCount).toBe(1);
  });

  it('POST /rm/allocate 403 for non-admin', async () => {
    const res = await request(server)
      .post('/rm/allocate')
      .set('x-test-role', 'user')
      .send({ systemSlug: 'craftor', amount: 10, reason: 'Test reason here' });
    expect(res.status).toBe(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /rm/allocate 400 when body fails validation (unknown field)', async () => {
    const res = await request(server)
      .post('/rm/allocate')
      .send({ systemSlug: 'ab', amount: 10, reason: 'ok', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /rm/allocate 400 when amount is not positive', async () => {
    const res = await request(server)
      .post('/rm/allocate')
      .send({ systemSlug: 'craftor', amount: 0, reason: 'Valid reason text' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /rm/allocate 400 when reason too short', async () => {
    const res = await request(server)
      .post('/rm/allocate')
      .send({ systemSlug: 'craftor', amount: 5, reason: 'ab' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /rm/allocate 400 when systemSlug exceeds max length', async () => {
    const res = await request(server)
      .post('/rm/allocate')
      .send({ systemSlug: 'a'.repeat(65), amount: 10, reason: 'Valid reason text' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /rm/allocate 400 when reason exceeds max length', async () => {
    const res = await request(server)
      .post('/rm/allocate')
      .send({ systemSlug: 'craftor', amount: 10, reason: 'x'.repeat(256) });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /rm/overview parses decimal string totals and rounds ROI', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: '33.5' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ total: '10' }], rowCount: 1 } as never);

    const res = await request(server).get('/rm/overview');
    expect(res.status).toBe(200);
    expect(res.body.data.budgetAllocated).toBeCloseTo(33.5);
    expect(res.body.data.realizedRevenue).toBe(10);
    expect(res.body.data.roi).toBe(29.85);
  });

  it('GET /rm/overview returns 400 when query params are present', async () => {
    const res = await request(server).get('/rm/overview').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /rm/overview returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/rm/overview').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /rm/allocate returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/rm/allocate')
      .query({ dry: '1' })
      .send({ systemSlug: 'craftor', amount: 10, reason: 'Valid reason text' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /rm/overview', async () => {
    rmAuthOn = false;
    const res = await request(server).get('/rm/overview');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /rm/allocate', async () => {
    rmAuthOn = false;
    const res = await request(server)
      .post('/rm/allocate')
      .send({ systemSlug: 'craftor', amount: 10, reason: 'Valid reason text' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /rm/overview even with x-test-role admin header', async () => {
    rmAuthOn = false;
    const res = await request(server).get('/rm/overview').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /rm/allocate even with x-test-role admin header', async () => {
    rmAuthOn = false;
    const res = await request(server)
      .post('/rm/allocate')
      .set('x-test-role', 'admin')
      .send({ systemSlug: 'craftor', amount: 10, reason: 'Valid reason text' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
