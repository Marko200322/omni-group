import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../../../database/connection';
import { ApexPredatorModule } from '../../../../modules/apex-predator/apex-predator.module';
import { sendError } from '../../../../utils/response';
import { AppError } from '../../../../utils/errors';

jest.mock('../../../../database/connection');

let apexAuthOn = true;
jest.mock('../../../../api/middleware/auth.middleware', () => {
  const errors = jest.requireActual<typeof import('../../../../utils/errors')>('../../../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!apexAuthOn) {
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
    .mockResolvedValueOnce({ rows: [{ id: 'r' }], rowCount: 1 } as never)
    .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
}

describe('ApexPredatorModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new ApexPredatorModule();
    await m.initialize();
    app.use('/apex', m.router);
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
    apexAuthOn = true;
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  it('GET /apex lists profiles', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'a1' }], rowCount: 1 } as never);
    expect((await request(server).get('/apex')).status).toBe(200);
  });

  it('POST /apex creates with default risk profile', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'new' }], rowCount: 1 } as never);
    const res = await request(server).post('/apex').send({ name: 'Prof' });
    expect(res.status).toBe(201);
    const cfg = JSON.parse((mockQuery.mock.calls[0][1] as unknown[])[3] as string);
    expect(cfg.risk_profile).toBe('medium');
  });

  it('POST /apex persists explicit high risk profile', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'risky' }], rowCount: 1 } as never);
    const res = await request(server).post('/apex').send({ name: 'HighRoll', riskProfile: 'high' });
    expect(res.status).toBe(201);
    const cfg = JSON.parse((mockQuery.mock.calls[0][1] as unknown[])[3] as string);
    expect(cfg.risk_profile).toBe('high');
  });

  it.each([
    ['outreach', 'prospecting'],
    ['upsell', 'monetizing'],
    ['retention', 'stabilizing'],
    ['risk-shield', 'shielding'],
  ] as const)('POST /apex/run mode %s', async (mode, expectedState) => {
    runThree('aid');
    const res = await request(server).post('/apex/aid/run').send({ mode, intensity: 30 });
    expect(res.status).toBe(200);
    const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[2] as string);
    expect(out).toEqual(
      expect.objectContaining({
        mode,
        intensity: 30,
        nextDomainState: expectedState,
        estimatedRevenue: expect.any(Number),
        conversionRate: expect.any(Number),
        retentionRate: expect.any(Number),
        conversion_rate: expect.any(Number),
        estimated_revenue: expect.any(Number),
      })
    );
  });

  it('POST /apex/:id/run validates params and payload strictly', async () => {
    const res = await request(server).post('/apex/invalid id!/run').send({
      mode: 'invalid',
      intensity: 0,
      extra: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /apex/admin/risk-grid requires admin', async () => {
    expect((await request(server).get('/apex/admin/risk-grid')).status).toBe(403);
  });

  it('GET /apex/admin/risk-grid returns rows', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'x', name: 'N' }], rowCount: 1 } as never);
    const res = await request(server).get('/apex/admin/risk-grid').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'x', name: 'N' }]);
  });

  it('POST /apex/:id/run 404', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    expect((await request(server).post('/apex/mm/run').send({ mode: 'outreach' })).status).toBe(404);
  });

  it('POST /apex rejects unknown body keys (strict schema)', async () => {
    const res = await request(server).post('/apex').send({ name: 'OkName', shadowProp: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /apex accepts two-character name aligned with ecosystem DTOs', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'short' }], rowCount: 1 } as never);
    const res = await request(server).post('/apex').send({ name: 'Ab' });
    expect(res.status).toBe(201);
  });

  it('POST /apex/:id/run rejects intensity below minimum', async () => {
    const res = await request(server).post('/apex/sid/run').send({ mode: 'outreach', intensity: 0 });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /apex/:id/run accepts intensity at maximum (100)', async () => {
    runThree('max-int');
    const res = await request(server).post('/apex/max-int/run').send({ mode: 'retention', intensity: 100 });
    expect(res.status).toBe(200);
    const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[2] as string);
    expect(out.intensity).toBe(100);
    expect(out.mode).toBe('retention');
  });

  it('POST /apex/:id/run rejects intensity above maximum', async () => {
    const res = await request(server).post('/apex/sid/run').send({ mode: 'outreach', intensity: 101 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /apex returns 400 when query params are present', async () => {
    const res = await request(server).get('/apex').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /apex returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/apex').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /apex returns 400 when query params are present', async () => {
    const res = await request(server).post('/apex').query({ draft: '1' }).send({ name: 'Ok' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /apex/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/apex/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'outreach', intensity: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /apex/admin/risk-grid returns 400 when query params are present', async () => {
    const res = await request(server).get('/apex/admin/risk-grid').set('x-test-role', 'admin').query({ x: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /apex/admin/risk-grid returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/apex/admin/risk-grid').set('x-test-role', 'admin').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /apex', async () => {
    apexAuthOn = false;
    const res = await request(server).get('/apex');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /apex', async () => {
    apexAuthOn = false;
    const res = await request(server).post('/apex').send({ name: 'No' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /apex/:id/run', async () => {
    apexAuthOn = false;
    const res = await request(server).post('/apex/aid/run').send({ mode: 'outreach', intensity: 30 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated user apex routes even with x-test-role admin header', async () => {
    apexAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/apex').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/apex').set(adminHdr).send({ name: 'No' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/apex/aid/run').set(adminHdr).send({ mode: 'outreach', intensity: 30 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /apex/admin/risk-grid even with x-test-role admin header', async () => {
    apexAuthOn = false;
    const res = await request(server).get('/apex/admin/risk-grid').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
