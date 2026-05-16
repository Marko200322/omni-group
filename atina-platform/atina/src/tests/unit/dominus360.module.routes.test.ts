import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { Dominus360Module } from '../../modules/dominus360/dominus360.module';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

jest.mock('../../database/connection');

let dominusAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => {
  const errors = jest.requireActual<typeof import('../../utils/errors')>('../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!dominusAuthOn) {
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

describe('Dominus360Module HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new Dominus360Module();
    await m.initialize();
    app.use('/dominus360', m.router);
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
    dominusAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /dominus360 lists workspaces', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'd1' }], rowCount: 1 } as never);
    const res = await request(server).get('/dominus360');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'd1' }]);
  });

  it('POST /dominus360 creates with default stage', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'new' }], rowCount: 1 } as never);
    const res = await request(server).post('/dominus360').send({ name: 'WSP' });
    expect(res.status).toBe(201);
    const args = mockQuery.mock.calls[0][1] as unknown[];
    expect(args[2]).toBe('v1');
    expect(JSON.parse(args[4] as string)).toEqual({ risk_score: 50, forecasts: 0 });
  });

  it('POST /dominus360 rejects name shorter than 3 characters', async () => {
    const res = await request(server).post('/dominus360').send({ name: 'ab' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /dominus360 rejects stage shorter than 2 characters', async () => {
    const res = await request(server).post('/dominus360').send({ name: 'WSP2', stage: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /dominus360 rejects unknown body keys on create', async () => {
    const res = await request(server).post('/dominus360').send({ name: 'WSP3', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /dominus360/:id/run rejects unknown body keys', async () => {
    const res = await request(server).post('/dominus360/a1/run').send({ mode: 'forecast', extra: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /dominus360/run forecast mode', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'sid', stage: 'v2' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/dominus360/sid/run').send({ mode: 'forecast' });
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe('dominus_forecast');
    const input = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[2] as string);
    expect(input).toEqual({ mode: 'forecast', input: {} });
    const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[3] as string);
    expect(out.result.forecast_growth_pct).toBe(14.2);
  });

  it('POST /dominus360/:id/run N3-D4 persists cumulative forecasts on UPDATE', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'sid', stage: 'v2', metrics: { forecasts: 5 } }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/dominus360/sid/run').send({ mode: 'forecast' });
    expect(res.status).toBe(200);
    const updateArgs = mockQuery.mock.calls[2][1] as unknown[];
    expect(updateArgs[2]).toBe(6);
  });

  it('POST /dominus360/run risk-scan branch', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'rid', stage: 'v1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'r1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/dominus360/rid/run').send({ mode: 'risk-scan', input: { a: 1 } });
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe('dominus_risk-scan');
    const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[3] as string);
    expect(out.mode).toBe('risk-scan');
  });

  it('POST /dominus360/run resource-allocation branch', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'aid', stage: 'v2' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'r2' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server)
      .post('/dominus360/aid/run')
      .send({ mode: 'resource-allocation', input: {} });

    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe('dominus_resource-allocation');
  });

  it('POST /dominus360/:id/run blocks advanced modes under minimum stage', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'a1', stage: 'v1' }], rowCount: 1 } as never);
    const res = await request(server).post('/dominus360/a1/run').send({ mode: 'forecast' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /dominus360/:id/run blocks resource-allocation on v1 while allowing risk-scan', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'v1a', stage: 'v1' }], rowCount: 1 } as never);
    const blocked = await request(server).post('/dominus360/v1a/run').send({ mode: 'resource-allocation' });
    expect(blocked.status).toBe(400);
    expect(blocked.body.error?.code).toBe('VALIDATION_ERROR');

    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'v1b', stage: 'v1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'rs' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const ok = await request(server).post('/dominus360/v1b/run').send({ mode: 'risk-scan' });
    expect(ok.status).toBe(200);
  });

  it('POST /dominus360/:id/run validates input payload shape', async () => {
    const res = await request(server).post('/dominus360/a1/run').send({ mode: 'forecast', input: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error?.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'input' })])
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /dominus360/:id/run rejects unknown mode', async () => {
    const res = await request(server).post('/dominus360/a1/run').send({ mode: 'not-a-mode' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /dominus360/:id/run 404 when workspace missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).post('/dominus360/missing/run').send({ mode: 'forecast' });
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  it('POST /dominus360/:id/run treats empty body as forecast on v2', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'v2def', stage: 'v2' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run-def' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/dominus360/v2def/run').send({});
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe('dominus_forecast');
    const input = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[2] as string);
    expect(input).toEqual({ mode: 'forecast', input: {} });
  });

  it('GET /dominus360 returns 400 when query params are present', async () => {
    const res = await request(server).get('/dominus360').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /dominus360 returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/dominus360').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /dominus360 returns 400 when query params are present', async () => {
    const res = await request(server).post('/dominus360').query({ draft: '1' }).send({ name: 'WSP' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /dominus360/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/dominus360/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'forecast' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /dominus360', async () => {
    dominusAuthOn = false;
    const res = await request(server).get('/dominus360');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /dominus360', async () => {
    dominusAuthOn = false;
    const res = await request(server).post('/dominus360').send({ name: 'WSP' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /dominus360/:id/run', async () => {
    dominusAuthOn = false;
    const res = await request(server).post('/dominus360/sid/run').send({ mode: 'forecast' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated dominus360 routes even with x-test-role admin header', async () => {
    dominusAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/dominus360').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/dominus360').set(adminHdr).send({ name: 'WSP' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/dominus360/sid/run').set(adminHdr).send({ mode: 'forecast' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
