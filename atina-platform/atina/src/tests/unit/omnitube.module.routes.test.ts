import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { OmniTubeModule } from '../../modules/omnitube/omnitube.module';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

jest.mock('../../database/connection');

let omnitubeAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => {
  const errors = jest.requireActual<typeof import('../../utils/errors')>('../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!omnitubeAuthOn) {
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

function runMocks(systemId: string) {
  return mockQuery
    .mockResolvedValueOnce({ rows: [{ id: systemId }], rowCount: 1 } as never)
    .mockResolvedValueOnce({ rows: [{ id: 'run' }], rowCount: 1 } as never)
    .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
}

describe('OmniTubeModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new OmniTubeModule();
    await m.initialize();
    app.use('/omnitube', m.router);
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
    omnitubeAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /omnitube lists channels', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'c1' }], rowCount: 1 } as never);
    const res = await request(server).get('/omnitube');
    expect(res.status).toBe(200);
  });

  it('POST /omnitube creates with default platform', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'n1' }], rowCount: 1 } as never);
    const res = await request(server).post('/omnitube').send({ name: 'Ch' });
    expect(res.status).toBe(201);
    const cfg = JSON.parse((mockQuery.mock.calls[0][1] as unknown[])[3] as string);
    expect(cfg.platform).toBe('youtube');
  });

  it.each([
    ['publish', 90, 3200],
    ['optimize', 120, 5100],
    ['idea', 30, 700],
    ['production', 30, 700],
  ] as const)('POST /omnitube/:id/run mode %s', async (mode, revenue, views) => {
    runMocks('sid');
    const res = await request(server).post('/omnitube/sid/run').send({ mode });
    expect(res.status).toBe(200);
    const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[2] as string);
    expect(out.estimated_revenue).toBe(revenue);
    expect(out.module).toBe('omnitube');
    expect(out.units_produced).toBe(views);
    expect(out.run_score).toBeGreaterThan(0);
    expect(out.details.views_generated).toBe(views);
  });

  it('POST /omnitube/:id/run 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).post('/omnitube/missing-1/run').send({ mode: 'publish' });
    expect(res.status).toBe(404);
  });

  it('POST /omnitube/:id/run rejects invalid id format', async () => {
    const res = await request(server).post('/omnitube/invalid-id!/run').send({ mode: 'publish' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnitube rejects unknown body keys (strict schema)', async () => {
    const res = await request(server).post('/omnitube').send({ name: 'ValidName', extraField: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnitube rejects name shorter than minimum', async () => {
    const res = await request(server).post('/omnitube').send({ name: 'A' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnitube rejects non-finite budget', async () => {
    const res = await request(server).post('/omnitube').send({ name: 'Ok', budgetAllocated: Number.NaN });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /omnitube/:unknownPath returns 404', async () => {
    const res = await request(server).get('/omnitube/no-such-route');
    expect(res.status).toBe(404);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnitube/:id/run rejects invalid mode', async () => {
    const res = await request(server).post('/omnitube/sid/run').send({ mode: 'livestream' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnitube/:id/run rejects unknown body keys (strict schema)', async () => {
    const res = await request(server).post('/omnitube/sid/run').send({ mode: 'publish', shadow: true });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /omnitube returns 400 when query params are present', async () => {
    const res = await request(server).get('/omnitube').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /omnitube returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/omnitube').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnitube returns 400 when query params are present', async () => {
    const res = await request(server).post('/omnitube').query({ draft: '1' }).send({ name: 'Channel' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnitube/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/omnitube/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'publish' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /omnitube returns 400 when platform is invalid', async () => {
    const res = await request(server).post('/omnitube').send({ name: 'Ok name', platform: 'vimeo' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /omnitube', async () => {
    omnitubeAuthOn = false;
    const res = await request(server).get('/omnitube');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /omnitube', async () => {
    omnitubeAuthOn = false;
    const res = await request(server).post('/omnitube').send({ name: 'No auth' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /omnitube/:id/run', async () => {
    omnitubeAuthOn = false;
    const res = await request(server).post('/omnitube/sid/run').send({ mode: 'publish' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated omnitube routes even with x-test-role admin header', async () => {
    omnitubeAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/omnitube').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/omnitube').set(adminHdr).send({ name: 'No auth' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/omnitube/sid/run').set(adminHdr).send({ mode: 'publish' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
