import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { GdprModule } from '../../modules/gdpr/gdpr.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var gdprRepo: {
  listByUser: jest.Mock;
  listAll: jest.Mock;
  create: jest.Mock;
  process: jest.Mock;
};

jest.mock('../../modules/gdpr/repository/gdpr.repository', () => {
  gdprRepo = {
    listByUser: jest.fn().mockResolvedValue({ rows: [{ id: 'g1' }] }),
    listAll: jest.fn().mockResolvedValue({ rows: [{ id: 'g1', email: 'a@b.com' }] }),
    create: jest.fn().mockResolvedValue({ rows: [{ id: 'gdpr-new', request_type: 'export' }] }),
    process: jest.fn().mockResolvedValue({ rows: [{ id: '123e4567-e89b-12d3-a456-426614174000', status: 'approved' }] }),
  };
  return {
    GdprRepository: jest.fn().mockImplementation(() => gdprRepo),
  };
});

let authEnabled = true;
let userRole: 'user' | 'admin' = 'user';

jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!authEnabled) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'u1',
      role: userRole,
      email: 'u@test.com',
    };
    next();
  },
  requireAdmin: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (userRole !== 'admin') {
      return next(new AppError('Insufficient permissions', 403, 'AUTHORIZATION_ERROR'));
    }
    return next();
  },
}));

describe('GdprModule HTTP list/query validation', () => {
  let server: http.Server;

  const expectSuccessSchema = (body: Record<string, unknown>) => {
    expect(body).toMatchObject({
      success: true,
      message: expect.any(String),
    });
    expect(body).toHaveProperty('data');
  };

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new GdprModule();
    await m.initialize();
    app.use('/gdpr', m.router);
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
    userRole = 'user';
    jest.clearAllMocks();
    gdprRepo.listByUser.mockResolvedValue({ rows: [{ id: 'g1' }] });
    gdprRepo.listAll.mockResolvedValue({ rows: [{ id: 'g1', email: 'a@b.com' }] });
    gdprRepo.create.mockResolvedValue({ rows: [{ id: 'gdpr-new', request_type: 'export' }] });
    gdprRepo.process.mockResolvedValue({
      rows: [{ id: '123e4567-e89b-12d3-a456-426614174000', status: 'approved' }],
    });
  });

  it('GET /mine succeeds with no query', async () => {
    const res = await request(server).get('/gdpr/mine');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(gdprRepo.listByUser).toHaveBeenCalled();
  });

  it('GET /mine succeeds with scope=mine', async () => {
    const res = await request(server).get('/gdpr/mine').query({ scope: 'mine' });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(gdprRepo.listByUser).toHaveBeenCalled();
  });

  it('GET /mine returns 400 for scope=all', async () => {
    const res = await request(server).get('/gdpr/mine').query({ scope: 'all' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /mine returns 400 for invalid scope', async () => {
    const res = await request(server).get('/gdpr/mine').query({ scope: 'everyone' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /mine returns 400 for unknown query keys (strict)', async () => {
    const res = await request(server).get('/gdpr/mine').query({ page: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /mine returns 400 for duplicate scope query params', async () => {
    const res = await request(server).get('/gdpr/mine?scope=mine&scope=all');
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /mine returns 400 for wrong-case scope', async () => {
    const res = await request(server).get('/gdpr/mine').query({ scope: 'Mine' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /mine succeeds with trimmed scope (leading/trailing spaces)', async () => {
    const res = await request(server).get('/gdpr/mine').query({ scope: '  mine  ' });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(gdprRepo.listByUser).toHaveBeenCalled();
  });

  it('GET /mine succeeds when scope is empty string (treated as absent)', async () => {
    const res = await request(server).get('/gdpr/mine').query({ scope: '' });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(gdprRepo.listByUser).toHaveBeenCalled();
  });

  it('GET /admin/all succeeds for admin with no query', async () => {
    userRole = 'admin';
    const res = await request(server).get('/gdpr/admin/all');
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(gdprRepo.listAll).toHaveBeenCalled();
  });

  it('GET /admin/all succeeds for admin with scope=all', async () => {
    userRole = 'admin';
    const res = await request(server).get('/gdpr/admin/all').query({ scope: 'all' });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(gdprRepo.listAll).toHaveBeenCalled();
  });

  it('GET /admin/all returns 400 for scope=mine', async () => {
    userRole = 'admin';
    const res = await request(server).get('/gdpr/admin/all').query({ scope: 'mine' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listAll).not.toHaveBeenCalled();
  });

  it('GET /admin/all returns 400 for unknown query keys (strict)', async () => {
    userRole = 'admin';
    const res = await request(server).get('/gdpr/admin/all').query({ limit: '10' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listAll).not.toHaveBeenCalled();
  });

  it('GET /admin/all returns 400 for duplicate scope query params', async () => {
    userRole = 'admin';
    const res = await request(server).get('/gdpr/admin/all?scope=all&scope=mine');
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listAll).not.toHaveBeenCalled();
  });

  it('GET /admin/all returns 400 for wrong-case scope', async () => {
    userRole = 'admin';
    const res = await request(server).get('/gdpr/admin/all').query({ scope: 'ALL' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listAll).not.toHaveBeenCalled();
  });

  it('GET /admin/all succeeds with trimmed scope', async () => {
    userRole = 'admin';
    const res = await request(server).get('/gdpr/admin/all').query({ scope: '  all  ' });
    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(gdprRepo.listAll).toHaveBeenCalled();
  });

  it('POST /admin/:id/process returns 400 when id is not a uuid', async () => {
    userRole = 'admin';
    const res = await request(server)
      .post('/gdpr/admin/not-a-uuid/process')
      .send({ status: 'approved' });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
  });

  it('GET /gdpr/mine returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/gdpr/mine').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listByUser).not.toHaveBeenCalled();
  });

  it('GET /gdpr/admin/all returns 400 when body is not strictly empty', async () => {
    userRole = 'admin';
    const res = await request(server).get('/gdpr/admin/all').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.listAll).not.toHaveBeenCalled();
  });

  it('POST /gdpr/request returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/gdpr/request')
      .query({ draft: '1' })
      .send({ requestType: 'export', payload: {} });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.create).not.toHaveBeenCalled();
  });

  it('POST /gdpr/request returns 400 on unknown body keys (strict)', async () => {
    const res = await request(server).post('/gdpr/request').send({ requestType: 'export', payload: {}, extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.create).not.toHaveBeenCalled();
  });

  it('POST /gdpr/request returns 400 when requestType is invalid', async () => {
    const res = await request(server).post('/gdpr/request').send({ requestType: 'erase', payload: {} });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.create).not.toHaveBeenCalled();
  });

  it('POST /gdpr/request creates request with valid body', async () => {
    const res = await request(server).post('/gdpr/request').send({ requestType: 'delete', payload: { reason: 'test' } });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(gdprRepo.create).toHaveBeenCalledWith('u1', 'delete', { reason: 'test' });
  });

  it('POST /gdpr/admin/:id/process returns 400 when query params are present', async () => {
    userRole = 'admin';
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(server)
      .post(`/gdpr/admin/${id}/process`)
      .query({ force: '1' })
      .send({ status: 'completed', response: {} });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.process).not.toHaveBeenCalled();
  });

  it('POST /gdpr/admin/:id/process returns 400 on unknown body keys (strict)', async () => {
    userRole = 'admin';
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(server)
      .post(`/gdpr/admin/${id}/process`)
      .send({ status: 'rejected', response: {}, leak: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    expect(gdprRepo.process).not.toHaveBeenCalled();
  });

  it('POST /gdpr/admin/:id/process succeeds with valid body', async () => {
    userRole = 'admin';
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(server).post(`/gdpr/admin/${id}/process`).send({ status: 'approved', response: { note: 'ok' } });
    expect(res.status).toBe(200);
    expect(gdprRepo.process).toHaveBeenCalledWith(id, 'approved', { note: 'ok' });
  });

  it('rejects unauthenticated GET /gdpr/mine', async () => {
    authEnabled = false;
    const res = await request(server).get('/gdpr/mine');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(gdprRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /gdpr/request', async () => {
    authEnabled = false;
    const res = await request(server).post('/gdpr/request').send({ requestType: 'export', payload: {} });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(gdprRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /gdpr/mine even with x-test-role admin header', async () => {
    authEnabled = false;
    const res = await request(server).get('/gdpr/mine').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(gdprRepo.listByUser).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /gdpr/request even with x-test-role admin header', async () => {
    authEnabled = false;
    const res = await request(server)
      .post('/gdpr/request')
      .set('x-test-role', 'admin')
      .send({ requestType: 'export', payload: {} });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(gdprRepo.create).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /gdpr/admin/all', async () => {
    authEnabled = false;
    const res = await request(server).get('/gdpr/admin/all');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(gdprRepo.listAll).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /gdpr/admin/:id/process', async () => {
    authEnabled = false;
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(server)
      .post(`/gdpr/admin/${id}/process`)
      .send({ status: 'approved', response: { note: 'ok' } });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(gdprRepo.process).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /gdpr/admin/all even with x-test-role admin header', async () => {
    authEnabled = false;
    const res = await request(server).get('/gdpr/admin/all').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(gdprRepo.listAll).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /gdpr/admin/:id/process even with x-test-role admin header', async () => {
    authEnabled = false;
    const id = '123e4567-e89b-12d3-a456-426614174000';
    const res = await request(server)
      .post(`/gdpr/admin/${id}/process`)
      .set('x-test-role', 'admin')
      .send({ status: 'approved', response: { note: 'ok' } });
    expect(res.status).toBe(401);
    expect(res.body.error?.code).toBe('AUTHENTICATION_ERROR');
    expect(gdprRepo.process).not.toHaveBeenCalled();
  });
});
