import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { OmniGameModule } from '../../modules/omnigame/omnigame.module';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

jest.mock('../../database/connection');
jest.mock('../../modules/tasks/task-executors', () => ({
  executeOmnigameValidate: jest.fn().mockResolvedValue({
    validation_score: 84,
    steam_trends_scraped: false,
    build_ready: false,
  }),
}));

let omnigameAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => {
  const errors = jest.requireActual<typeof import('../../utils/errors')>('../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!omnigameAuthOn) {
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

function runThree(id: string) {
  return mockQuery
    .mockResolvedValueOnce({ rows: [{ id }], rowCount: 1 } as never)
    .mockResolvedValueOnce({ rows: [{ id: 'r' }], rowCount: 1 } as never)
    .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
}

describe('OmniGameModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new OmniGameModule();
    await m.initialize();
    app.use('/omnigame', m.router);
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
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /omnigame lists projects', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    expect((await request(server).get('/omnigame')).status).toBe(200);
  });

  it('POST /omnigame creates', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'g1' }], rowCount: 1 } as never);
    const res = await request(server).post('/omnigame').send({ name: 'Game', genre: 'puzzle' });
    expect(res.status).toBe(201);
  });

  it.each([
    ['publish', 480, 55],
    ['validate', 110, 84],
    ['prototype', 70, 62],
    ['trend-scan', 70, 55],
  ] as const)('POST /omnigame/run mode %s', async (mode, revenue, score) => {
    runThree('gid');
    const res = await request(server).post('/omnigame/gid/run').send({ mode });
    expect(res.status).toBe(200);
    const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[2] as string);
    expect(out.estimated_revenue).toBe(revenue);
    expect(out.module).toBe('omnigame');
    expect(out.run_score).toBe(score);
    expect(out.units_produced).toBeGreaterThan(0);
    expect(out.details.validation_score).toBe(score);
  });

  it('POST /omnigame/:id/run 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    expect((await request(server).post('/omnigame/missing-1/run').send({ mode: 'prototype' })).status).toBe(404);
  });

  it('POST /omnigame/:id/run rejects invalid id format', async () => {
    const res = await request(server).post('/omnigame/invalid-id!/run').send({ mode: 'prototype' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnigame rejects unknown body keys (strict schema)', async () => {
    const res = await request(server).post('/omnigame').send({ name: 'Game', genre: 'puzzle', injected: true });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnigame rejects genre shorter than minimum', async () => {
    const res = await request(server).post('/omnigame').send({ name: 'Game', genre: 'x' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /omnigame/:unknownPath returns 404', async () => {
    const res = await request(server).get('/omnigame/not-a-handler');
    expect(res.status).toBe(404);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnigame rejects non-finite budget', async () => {
    const res = await request(server).post('/omnigame').send({ name: 'Game', genre: 'puzzle', budgetAllocated: Number.POSITIVE_INFINITY });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnigame/:id/run rejects invalid mode', async () => {
    const res = await request(server).post('/omnigame/gid/run').send({ mode: 'ship' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnigame/:id/run rejects unknown body keys (strict schema)', async () => {
    const res = await request(server).post('/omnigame/gid/run').send({ mode: 'prototype', beta: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /omnigame returns 400 when query params are present', async () => {
    const res = await request(server).get('/omnigame').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /omnigame returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/omnigame').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnigame returns 400 when query params are present', async () => {
    const res = await request(server).post('/omnigame').query({ draft: '1' }).send({ name: 'Game', genre: 'puzzle' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnigame/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/omnigame/gid/run')
      .query({ sync: '1' })
      .send({ mode: 'prototype' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /omnigame', async () => {
    omnigameAuthOn = false;
    const res = await request(server).get('/omnigame');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /omnigame', async () => {
    omnigameAuthOn = false;
    const res = await request(server).post('/omnigame').send({ name: 'X', genre: 'puzzle' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /omnigame/:id/run', async () => {
    omnigameAuthOn = false;
    const res = await request(server).post('/omnigame/gid/run').send({ mode: 'prototype' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated omnigame routes even with x-test-role admin header', async () => {
    omnigameAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/omnigame').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/omnigame').set(adminHdr).send({ name: 'X', genre: 'puzzle' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/omnigame/gid/run').set(adminHdr).send({ mode: 'prototype' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
