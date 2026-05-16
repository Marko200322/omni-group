import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { ValidatorModule } from '../../modules/validator/validator.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var validatorRepo: {
  listByUser: jest.Mock;
  create: jest.Mock;
  getOwned: jest.Mock;
  createRun: jest.Mock;
  updateAfterRun: jest.Mock;
};

jest.mock('../../modules/validator/repository/validator.repository', () => {
  validatorRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'w1' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'new-w' }] }),
    getOwned: jest.fn().mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 }),
    createRun: jest.fn().mockResolvedValue({ rows: [{ id: 'run-http' }] }),
    updateAfterRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    ValidatorRepository: jest.fn().mockImplementation(() => validatorRepo),
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

describe('ValidatorModule HTTP routes', () => {
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
    const m = new ValidatorModule();
    await m.initialize();
    app.use('/validator', m.router);
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
    validatorRepo.listByUser.mockResolvedValue({ rows: [{ id: 'w1' }] });
    validatorRepo.create.mockResolvedValue({ rows: [{ id: 'new-w' }] });
    validatorRepo.getOwned.mockResolvedValue({ rows: [{ id: 'sid' }], rowCount: 1 });
    validatorRepo.createRun.mockResolvedValue({ rows: [{ id: 'run-http' }] });
    validatorRepo.updateAfterRun.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('GET lists workspaces', async () => {
    const res = await request(server).get('/validator');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
  });

  it('GET /status returns shape', async () => {
    const res = await request(server).get('/validator/status');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data).toHaveProperty('modes');
  });

  it('POST /:id/run', async () => {
    const res = await request(server).post('/validator/sid/run').send({ mode: 'validate', intensity: 30 });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(validatorRepo.createRun).toHaveBeenCalled();
  });

  it('POST /:id/run 404 when not found', async () => {
    validatorRepo.getOwned.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/validator/xx/run').send({ mode: 'sanitize', intensity: 20 });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /validator returns 400 when query params are present', async () => {
    const res = await request(server).get('/validator').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /validator returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/validator').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /validator/status returns 400 when query params are present', async () => {
    const res = await request(server).get('/validator/status').query({ debug: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /validator/status returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/validator/status').send({ peek: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /validator creates workspace with valid body', async () => {
    const res = await request(server).post('/validator').send({
      name: 'Validator workspace',
      budgetAllocated: 10,
      profile: 'strict',
    });
    expect(res.status).toBe(201);
    expectSuccessSchema(res.body);
    expect(validatorRepo.create).toHaveBeenCalledWith('u1', 'Validator workspace', 10, 'strict');
  });

  it('POST /validator returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/validator')
      .query({ draft: '1' })
      .send({ name: 'Good name', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.create).not.toHaveBeenCalled();
  });

  it('POST /validator returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/validator').send({ name: 'Good name', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.create).not.toHaveBeenCalled();
  });

  it('POST /validator returns 400 when name is shorter than minimum', async () => {
    const res = await request(server).post('/validator').send({ name: 'Ab', budgetAllocated: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.create).not.toHaveBeenCalled();
  });

  it('POST /validator returns 400 when profile is invalid', async () => {
    const res = await request(server).post('/validator').send({ name: 'Good name', profile: 'wild' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.create).not.toHaveBeenCalled();
  });

  it('POST /validator/:id/run returns 400 when workspace id format invalid', async () => {
    const res = await request(server).post('/validator/bad!!!/run').send({ mode: 'validate', intensity: 20 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /validator/:id/run returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/validator/sid/run')
      .query({ sync: '1' })
      .send({ mode: 'validate', intensity: 30 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /validator/:id/run returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server)
      .post('/validator/sid/run')
      .send({ mode: 'sanitize', intensity: 20, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /validator/:id/run returns 400 when intensity is out of range', async () => {
    const res = await request(server).post('/validator/sid/run').send({ mode: 'validate', intensity: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /validator/:id/run returns 400 when mode is invalid', async () => {
    const res = await request(server).post('/validator/sid/run').send({ mode: 'blast', intensity: 10 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.getOwned).not.toHaveBeenCalled();
  });

  it('POST /validator/:id/run returns 400 when valueEstimate is not positive', async () => {
    const res = await request(server)
      .post('/validator/sid/run')
      .send({ mode: 'enrich', intensity: 50, valueEstimate: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(validatorRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /validator', async () => {
    authEnabled = false;
    const res = await request(server).get('/validator');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(validatorRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /validator/status', async () => {
    authEnabled = false;
    const res = await request(server).get('/validator/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('rejects unauthenticated POST /validator', async () => {
    authEnabled = false;
    const res = await request(server).post('/validator').send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(validatorRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /validator/:id/run', async () => {
    authEnabled = false;
    const res = await request(server).post('/validator/sid/run').send({ mode: 'validate', intensity: 30 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(validatorRepo.getOwned).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated validator routes even with x-test-role admin header', async () => {
    authEnabled = false;
    const adminHdr = { 'x-test-role': 'admin' };

    let res = await request(server).get('/validator').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(validatorRepo.listByUser).not.toHaveBeenCalled();

    res = await request(server).get('/validator/status').set(adminHdr);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');

    res = await request(server)
      .post('/validator')
      .set(adminHdr)
      .send({ name: 'Auth check', budgetAllocated: 0 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(validatorRepo.create).not.toHaveBeenCalled();

    res = await request(server)
      .post('/validator/sid/run')
      .set(adminHdr)
      .send({ mode: 'validate', intensity: 30 });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(validatorRepo.getOwned).not.toHaveBeenCalled();
  });
});
