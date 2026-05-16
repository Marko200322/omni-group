import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { DealOfferModule } from '../../modules/deal-offer/deal-offer.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var dealOfferRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/deal-offer/repository/deal-offer.repository', () => {
  dealOfferRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    DealOfferRepository: jest.fn().mockImplementation(() => dealOfferRepo),
  };
});

let authEnabled = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authEnabled) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: 'user',
      email: 'u@test.com',
    };
    next();
  },
}));

jest.mock('../../api/middleware/rate-limit.middleware', () => ({
  authSessionLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('DealOfferModule HTTP routes', () => {
  let server: http.Server;

  const expectSuccessSchema = (body: Record<string, unknown>) => {
    expect(body).toMatchObject({
      success: true,
      message: expect.any(String),
    });
    expect(body).toHaveProperty('data');
    expect(body).not.toHaveProperty('error');
  };

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new DealOfferModule();
    await m.initialize();
    app.use('/deal-offer', m.router);
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
    authEnabled = true;
    jest.clearAllMocks();
    dealOfferRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    dealOfferRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    dealOfferRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    dealOfferRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    dealOfferRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('GET lists workspaces', async () => {
    const res = await request(server).get('/deal-offer');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
  });

  it('GET /status returns shape', async () => {
    const res = await request(server).get('/deal-offer/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('modes');
  });

  it('POST /:id/run', async () => {
    const res = await request(server).post('/deal-offer/sid/run').send({ mode: 'negotiate', intensity: 30 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(dealOfferRepo.createRun).toHaveBeenCalledWith(
      'sid',
      'deal-offer_negotiate',
      { mode: 'negotiate', intensity: 30 },
      expect.objectContaining({ mode: 'negotiate', intensity: 30 })
    );
  });

  it('POST /:id/run 404 when not found', async () => {
    dealOfferRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/deal-offer/xx/run').send({ mode: 'draft', intensity: 20 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects unauthenticated GET /deal-offer', async () => {
    authEnabled = false;
    const res = await request(server).get('/deal-offer');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(dealOfferRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /deal-offer/status', async () => {
    authEnabled = false;
    const res = await request(server).get('/deal-offer/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated POST /deal-offer', async () => {
    authEnabled = false;
    const res = await request(server)
      .post('/deal-offer')
      .send({ name: 'No auth', budgetAllocated: 0, mode: 'negotiate' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(dealOfferRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /deal-offer/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/deal-offer/sid/run').send({ mode: 'negotiate', intensity: 30 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(dealOfferRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated deal-offer routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/deal-offer').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(dealOfferRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server).get('/deal-offer/status').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');

    res = await request(server)
      .post('/deal-offer')
      .set(adminHdr)
      .send({ name: 'No auth', budgetAllocated: 0, mode: 'negotiate' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(dealOfferRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/deal-offer/sid/run')
      .set(adminHdr)
      .send({ mode: 'negotiate', intensity: 30 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(dealOfferRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /:id/run 400 when workspace id format invalid', async () => {
    const res = await request(server).post('/deal-offer/!!!/run').send({ mode: 'draft', intensity: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error?.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'id' })])
    );
    expect(dealOfferRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /:id/run 400 when intensity out of range', async () => {
    const res = await request(server).post('/deal-offer/sid/run').send({ mode: 'draft', intensity: 0 });
    expect(res.status).toBe(400);
    expect(dealOfferRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /:id/run 400 when revenueEstimate not positive', async () => {
    const res = await request(server)
      .post('/deal-offer/sid/run')
      .send({ mode: 'draft', intensity: 50, revenueEstimate: 0 });
    expect(res.status).toBe(400);
    expect(dealOfferRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST / creates workspace with valid body', async () => {
    const res = await request(server).post('/deal-offer').send({
      name: 'New deal workspace',
      budgetAllocated: 1000,
      mode: 'negotiate',
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(dealOfferRepo.create).toHaveBeenCalledWith('u1', 'New deal workspace', 1000, 'negotiate');
  });

  it('POST / 400 when create body has unknown keys', async () => {
    const res = await request(server).post('/deal-offer').send({ name: 'Valid name', extraField: true });
    expect(res.status).toBe(400);
    expect(dealOfferRepo.create).not.toHaveBeenCalled();
  });

  it('GET /deal-offer returns 400 when query params are present', async () => {
    const res = await request(server).get('/deal-offer').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(dealOfferRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /deal-offer returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/deal-offer').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(dealOfferRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /deal-offer/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/deal-offer/status').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /deal-offer/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/deal-offer/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /deal-offer returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/deal-offer')
      .query({ draft: '1' })
      .send({ name: 'New deal workspace', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(dealOfferRepo.create).not.toHaveBeenCalled();
  });

  it('POST /deal-offer returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/deal-offer').send({ name: 'Ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(dealOfferRepo.create).not.toHaveBeenCalled();
  });

  it('POST /deal-offer returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/deal-offer').send({ name: 'Good name', mode: 'turbo' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(dealOfferRepo.create).not.toHaveBeenCalled();
  });

  it('POST /deal-offer/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/deal-offer/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'negotiate', intensity: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(dealOfferRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /deal-offer/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/deal-offer/sid/run')
      .send({ mode: 'draft', intensity: 20, extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(dealOfferRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /deal-offer/:id/run returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/deal-offer/sid/run').send({ mode: 'invalid', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(dealOfferRepo.getOwned).not.toHaveBeenCalled();
  });
});
