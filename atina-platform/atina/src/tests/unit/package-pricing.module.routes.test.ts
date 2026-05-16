import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import * as db from '../../database/connection';
import { PackagePricingModule } from '../../modules/package-pricing/package-pricing.module';
import { sendError } from '../../utils/response';
import { AppError } from '../../utils/errors';

jest.mock('../../database/connection');

let packagePricingAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => {
  const errors = jest.requireActual<typeof import('../../utils/errors')>('../../utils/errors');
  return {
    authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
      if (!packagePricingAuthOn) {
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

describe('PackagePricingModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new PackagePricingModule();
    await m.initialize();
    app.use('/package-pricing', m.router);
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
    packagePricingAuthOn = true;
    mockQuery.mockReset();
  });

  it('GET /package-pricing lists workspaces', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'p1' }], rowCount: 1 } as never);
    const res = await request(server).get('/package-pricing');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([{ id: 'p1' }]);
    expect(mockQuery.mock.calls[0][1]).toContain('package-pricing');
  });

  it('POST /package-pricing creates with defaults', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'new', name: 'Offers' }],
      rowCount: 1,
    } as never);

    const res = await request(server).post('/package-pricing').send({ name: 'Offers' });
    expect(res.status).toBe(201);
    const args = mockQuery.mock.calls[0][1] as unknown[];
    expect(JSON.parse(args[4] as string)).toMatchObject({ base_price: 99, tiers_count: 0 });
  });

  it('POST /package-pricing/:id/run defaults mode and input when body empty', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'def', metrics: { tiers_count: 0 } }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);

    const res = await request(server).post('/package-pricing/def/run').send({});
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe('package-pricing_list-tiers');
  });

  it('POST /package-pricing/:id/run list-tiers mode', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [{ id: 'pid', metrics: { base_price: 100, tiers_count: 0 } }],
        rowCount: 1,
      } as never)
      .mockResolvedValueOnce({ rows: [{ id: 'run1' }], rowCount: 1 } as never)
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

    const res = await request(server).post('/package-pricing/pid/run').send({ mode: 'list-tiers' });
    expect(res.status).toBe(200);
    expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe('package-pricing_list-tiers');
    const input = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[2] as string);
    expect(input).toEqual({ mode: 'list-tiers', input: {} });
  });

  it('POST /package-pricing/:id/run adjust-price and bundle branches', async () => {
    for (const mode of ['adjust-price', 'bundle'] as const) {
      jest.clearAllMocks();
      mockQuery
        .mockResolvedValueOnce({
          rows: [{ id: 'xx', metrics: { base_price: 50, tiers_count: 3 } }],
          rowCount: 1,
        } as never)
        .mockResolvedValueOnce({ rows: [{ id: 'r' }], rowCount: 1 } as never)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);

      const res = await request(server)
        .post('/package-pricing/xx/run')
        .send(mode === 'adjust-price' ? { mode, input: { adjustmentPct: 7 } } : { mode });
      expect(res.status).toBe(200);
      expect((mockQuery.mock.calls[1][1] as unknown[])[1]).toBe(`package-pricing_${mode}`);
      const out = JSON.parse((mockQuery.mock.calls[1][1] as unknown[])[3] as string);
      expect(out.result).toBeDefined();
    }
  });

  it('POST /package-pricing/:id/run 404 when workspace missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const res = await request(server).post('/package-pricing/missing/run').send({ mode: 'list-tiers' });
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe('NOT_FOUND');
  });

  it('POST /package-pricing/:id/run blocks adjust-price without tiers', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'pid', metrics: { tiers_count: 0 } }],
      rowCount: 1,
    } as never);
    const res = await request(server).post('/package-pricing/pid/run').send({ mode: 'adjust-price' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /package-pricing/:id/run blocks bundle without enough tiers', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'pid', metrics: { tiers_count: 1 } }],
      rowCount: 1,
    } as never);
    const res = await request(server).post('/package-pricing/pid/run').send({ mode: 'bundle' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('POST /package-pricing/:id/run validates input payload shape', async () => {
    const res = await request(server)
      .post('/package-pricing/pid/run')
      .send({ mode: 'list-tiers', input: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error?.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'input' })])
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /package-pricing', async () => {
    packagePricingAuthOn = false;
    const res = await request(server).get('/package-pricing');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /package-pricing/:id/run 400 when workspace id format invalid', async () => {
    const res = await request(server).post('/package-pricing/!!!/run').send({ mode: 'list-tiers' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /package-pricing 400 on unknown body keys (strict schema)', async () => {
    const res = await request(server).post('/package-pricing').send({ name: 'Offers', extra: 1 });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /package-pricing 400 when name too short after trim', async () => {
    const res = await request(server).post('/package-pricing').send({ name: '  ab  ' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /package-pricing/:id/run 400 on invalid mode', async () => {
    const res = await request(server).post('/package-pricing/pid/run').send({ mode: 'delete-all' });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /package-pricing 400 when budgetAllocated is not finite', async () => {
    const res = await request(server).post('/package-pricing').send({ name: 'Good name', budgetAllocated: Number.NaN });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /package-pricing/:id/run 400 on unknown body keys (strict schema)', async () => {
    const res = await request(server).post('/package-pricing/pid/run').send({ mode: 'list-tiers', extra: true });
    expect(res.status).toBe(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /package-pricing returns 400 when query params are present', async () => {
    const res = await request(server).get('/package-pricing').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('GET /package-pricing returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/package-pricing').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /package-pricing returns 400 when query params are present', async () => {
    const res = await request(server).post('/package-pricing').query({ draft: '1' }).send({ name: 'Offers' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('POST /package-pricing/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/package-pricing/pid/run')
      .query({ sync: '1' })
      .send({ mode: 'list-tiers' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /package-pricing', async () => {
    packagePricingAuthOn = false;
    const res = await request(server).post('/package-pricing').send({ name: 'Offers' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /package-pricing/:id/run', async () => {
    packagePricingAuthOn = false;
    const res = await request(server).post('/package-pricing/pid/run').send({ mode: 'list-tiers' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated package-pricing routes even with x-test-role admin header', async () => {
    packagePricingAuthOn = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/package-pricing').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/package-pricing').set(adminHdr).send({ name: 'Offers' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();

    res = await request(server).post('/package-pricing/pid/run').set(adminHdr).send({ mode: 'list-tiers' });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
