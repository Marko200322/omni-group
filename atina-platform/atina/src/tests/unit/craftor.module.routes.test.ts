import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { CraftorModule } from '../../modules/craftor/craftor.module';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

jest.mock('../../database/connection');

let craftorAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => {
  const errors = jest.requireActual<typeof import('../../utils/errors')>('../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!craftorAuthOn) {
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

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('CraftorModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new CraftorModule();
    await m.initialize();
    app.use('/craftor', m.router);
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
    craftorAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /craftor/catalog returns V7 blueprint metadata', async () => {
    const res = await request(server).get('/craftor/catalog');
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe('7.0.0');
    expect(res.body.data.platforms).toEqual(expect.arrayContaining(['upwork', 'fiverr']));
    expect(res.body.data.modes).toEqual(expect.arrayContaining(['hunting', 'proposal', 'negotiation']));
    expect(res.body.data.workflow.length).toBeGreaterThan(5);
  });

  it('GET /craftor lists campaigns', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'c1' }], rowCount: 1 } as never);
    const res = await request(server).get('/craftor');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'c1' }]);
  });

  it('POST /craftor creates with V7 defaults', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'new', name: 'Camp' }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/craftor').send({ name: 'Camp' });
    expect(res.status).toBe(201);
    const args = mockQuery.mock.calls[0][1] as unknown[];
    expect(JSON.parse(args[3] as string)).toMatchObject({
      lead_target: 100,
      leads_collected: 0,
      niche: 'developer',
      platforms: ['upwork'],
      craftor_version: '7.0.0',
    });
  });

  it('POST /craftor creates with niche and platforms', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'n1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server)
      .post('/craftor')
      .send({ name: 'Design Camp', niche: 'designer', platforms: ['fiverr', 'linkedin'] });
    expect(res.status).toBe(201);
    const metrics = JSON.parse((mockQuery.mock.calls[0][1] as unknown[])[3] as string);
    expect(metrics.niche).toBe('designer');
    expect(metrics.platforms).toEqual(['fiverr', 'linkedin']);
  });

  it('POST /craftor rejects name shorter than 3 characters', async () => {
    const res = await request(server).post('/craftor').send({ name: 'ab' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /craftor rejects unknown body keys on create', async () => {
    const res = await request(server).post('/craftor').send({ name: 'Camp2', foo: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /craftor/:id/run rejects unknown body keys', async () => {
    const res = await request(server).post('/craftor/cid/run').send({ mode: 'lead-hunt', x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /craftor/:id/run hunting mode (V7)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'cid', metrics: { leads_collected: 0, niche: 'developer' } }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/craftor/cid/run').send({ mode: 'hunting' });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][1] as unknown[]).toContain('craftor_hunting');
    const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[3] as string);
    expect(out.result.v7_mode).toBe('hunting');
  });

  it('POST /craftor/:id/run legacy lead-hunt mode', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'cid', metrics: { leads_collected: 0 } }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/craftor/cid/run').send({ mode: 'lead-hunt' });
    expect(res.status).toBe(200);
    expect(mockQuery.mock.calls[1][1] as unknown[]).toContain('craftor_lead-hunt');
    const input = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[2] as string);
    expect(input).toMatchObject({ mode: 'lead-hunt', v7_mode: 'hunting', input: {} });
  });

  it('POST /craftor/:id/run persists cumulative leads_collected on UPDATE', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'cid', metrics: { leads_collected: 5 } }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/craftor/cid/run').send({ mode: 'hunting' });
    expect(res.status).toBe(200);
    const updateArgs = mockQuery.mock.calls[2][1] as unknown[];
    expect(updateArgs[4]).toBe(28);
  });

  it('POST /craftor/:id/run outreach, negotiation, and legacy modes', async () => {
    for (const mode of ['outreach', 'negotiation', 'follow-up', 'deal-close'] as const) {
      jest.clearAllMocks();
      mockQuery
        .mockResolvedValueOnce({ rows: [{ id: 'x', metrics: { leads_collected: 20, proposals_sent: 5, jobs_scored: 10 } }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'r' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      const res = await request(server).post('/craftor/x/run').send({ mode });
      expect(res.status).toBe(200);
      expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe(`craftor_${mode}`);
      const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[3] as string);
      expect(out.result).toBeDefined();
    }
  });

  it('POST /craftor/:id/run blocks analytics without enough proposals', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'cid', metrics: { leads_collected: 10, proposals_sent: 1 } }],
      rowCount: 1,
    } as never);
    const res = await request(server).post('/craftor/cid/run').send({ mode: 'analytics' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /craftor/:id/run 404 when campaign missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).post('/craftor/missing/run').send({ mode: 'hunting' });
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  it('POST /craftor/:id/run blocks negotiation/deal-close without minimum readiness', async () => {
    for (const mode of ['deal-close', 'negotiation'] as const) {
      jest.clearAllMocks();
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'cid', metrics: { leads_collected: 2 } }], rowCount: 1 } as never);
      const res = await request(server).post('/craftor/cid/run').send({ mode });
      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    }
  });

  it('POST /craftor/:id/run allows deal-close/negotiation at 10 leads and coerces string counts', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'b1', metrics: { leads_collected: 10 } }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'r10' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const atBoundary = await request(server).post('/craftor/b1/run').send({ mode: 'deal-close' });
    expect(atBoundary.status).toBe(200);

    jest.clearAllMocks();
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'b2', metrics: { leads_collected: '15' } }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'r15' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const stringCount = await request(server).post('/craftor/b2/run').send({ mode: 'negotiation' });
    expect(stringCount.status).toBe(200);

    jest.clearAllMocks();
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'b3', metrics: { leads_collected: 'not-a-number' } }],
      rowCount: 1,
    } as never);
    const invalidCount = await request(server).post('/craftor/b3/run').send({ mode: 'deal-close' });
    expect(invalidCount.status).toBe(400);
  });

  it('POST /craftor/:id/run validates input payload shape', async () => {
    const res = await request(server).post('/craftor/cid/run').send({ mode: 'follow-up', input: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error?.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'input' })])
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /craftor/:id/run rejects unknown mode', async () => {
    const res = await request(server).post('/craftor/cid/run').send({ mode: 'invalid-mode' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /craftor/:id/run treats empty body as hunting (V7 default)', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'def', metrics: { leads_collected: 0 } }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run-def' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/craftor/def/run').send({});
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe('craftor_hunting');
    const input = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[2] as string);
    expect(input).toMatchObject({ mode: 'hunting', v7_mode: 'hunting', input: {} });
  });

  it('GET /craftor returns 400 when query params are present', async () => {
    const res = await request(server).get('/craftor').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /craftor returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/craftor').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /craftor returns 400 when query params are present', async () => {
    const res = await request(server).post('/craftor').query({ draft: '1' }).send({ name: 'Camp' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /craftor/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/craftor/cid/run')
      .query({ sync: '1' })
      .send({ mode: 'lead-hunt' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /craftor', async () => {
    craftorAuthOn = false;
    const res = await request(server).get('/craftor');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /craftor', async () => {
    craftorAuthOn = false;
    const res = await request(server).post('/craftor').send({ name: 'Camp' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /craftor/:id/run', async () => {
    craftorAuthOn = false;
    const res = await request(server).post('/craftor/cid/run').send({ mode: 'lead-hunt' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated craftor routes even with x-test-role admin header', async () => {
    craftorAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/craftor').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/craftor').set(adminHdr).send({ name: 'Camp' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/craftor/cid/run').set(adminHdr).send({ mode: 'lead-hunt' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
