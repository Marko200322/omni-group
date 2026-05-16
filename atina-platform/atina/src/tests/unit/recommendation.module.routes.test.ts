import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { RecommendationModule } from '../../modules/recommendation/recommendation.module';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

jest.mock('../../database/connection');

let recommendationAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => {
  const errors = jest.requireActual<typeof import('../../utils/errors')>('../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!recommendationAuthOn) {
        throw new errors.AuthenticationError('No authentication token provided');
      }
      (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
        userId: 'u1',
        role: 'user',
        email: 'u@test.com',
      };
      next();
    },
  };
});

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('RecommendationModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new RecommendationModule();
    await m.initialize();
    app.use('/recommendation', m.router);
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
    recommendationAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  function mockCounts(subs: string, tasks: string, payments: string) {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: subs }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ count: tasks }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ count: payments }], rowCount: 1 } as never);
  }

  it('GET /recommendation/next-actions suggests subscription when none active', async () => {
    mockCounts('0', '0', '0');
    const res = await request(server).get('/recommendation/next-actions');
    expect(res.status).toBe(200);
    expect(res.body.data.recommendations.some((r: string) => r.includes('subscription'))).toBe(true);
  });

  it('GET /recommendation/next-actions suggests ecosystem scale when healthy', async () => {
    mockCounts('1', '0', '0');
    const res = await request(server).get('/recommendation/next-actions');
    expect(res.status).toBe(200);
    expect(res.body.data.recommendations[0]).toContain('ecosystem');
  });

  it('GET /recommendation/next-actions warns on failed tasks', async () => {
    mockCounts('1', '3', '0');
    const res = await request(server).get('/recommendation/next-actions');
    expect(res.body.data.recommendations.some((r: string) => r.includes('failed tasks'))).toBe(true);
  });

  it('GET /recommendation/next-actions warns on failed payments', async () => {
    mockCounts('1', '0', '2');
    const res = await request(server).get('/recommendation/next-actions');
    expect(res.body.data.recommendations.some((r: string) => r.includes('payments'))).toBe(true);
  });

  it('GET /recommendation/next-actions stacks multiple hints', async () => {
    mockCounts('0', '1', '1');
    const res = await request(server).get('/recommendation/next-actions');
    expect(res.body.data.recommendations.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /recommendation/next-actions returns 400 when query params are present', async () => {
    const res = await request(server).get('/recommendation/next-actions').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /recommendation/next-actions returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/recommendation/next-actions').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /recommendation/next-actions', async () => {
    recommendationAuthOn = false;
    const res = await request(server).get('/recommendation/next-actions');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /recommendation/next-actions even with x-test-role admin header', async () => {
    recommendationAuthOn = false;
    const res = await request(server).get('/recommendation/next-actions').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
