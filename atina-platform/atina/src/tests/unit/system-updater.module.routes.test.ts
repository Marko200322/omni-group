import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { SystemUpdaterModule } from '../../modules/system-updater/system-updater.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var updaterRepo: {
  queue: jest.Mock;
  list: jest.Mock;
  finish: jest.Mock;
};

jest.mock('../../modules/system-updater/repository/system-updater.repository', () => {
  updaterRepo = {
    queue: jest.fn(),
    list: jest.fn(),
    finish: jest.fn(),
  };
  return {
    SystemUpdaterRepository: jest.fn().mockImplementation(() => updaterRepo),
  };
});

let suAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!suAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    const role = (req.headers['x-test-role'] as string) || 'admin';
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'admin-1',
      role,
      email: 'admin@test.com',
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
}));

describe('SystemUpdaterModule HTTP routes', () => {
  let server: http.Server;
  const jobId = '123e4567-e89b-12d3-a456-426614174000';

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new SystemUpdaterModule();
    await m.initialize();
    app.use('/system-updater', m.router);
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
    suAuthOn = true;
    jest.clearAllMocks();
    updaterRepo.list.mockResolvedValue({ rows: [{ id: 'j1' }], rowCount: 1 });
    updaterRepo.queue.mockResolvedValue({ rows: [{ id: 'new-job' }], rowCount: 1 });
    updaterRepo.finish.mockResolvedValue({ rows: [{ id: jobId, status: 'completed' }], rowCount: 1 });
  });

  it('GET /jobs lists updater jobs', async () => {
    const res = await request(server).get('/system-updater/jobs');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: [{ id: 'j1' }] });
  });

  it('GET /jobs returns validation error when query params are present', async () => {
    const res = await request(server).get('/system-updater/jobs').query({ page: '1' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
    expect(updaterRepo.list).not.toHaveBeenCalled();
  });

  it('GET /jobs returns 400 when JSON body has unknown keys', async () => {
    const res = await request(server)
      .get('/system-updater/jobs')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ filter: 'all' }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(updaterRepo.list).not.toHaveBeenCalled();
  });

  it('GET /jobs returns 403 for non-admin', async () => {
    const res = await request(server).get('/system-updater/jobs').set('x-test-role', 'user');
    expect(res.status).toBe(403);
    expect(updaterRepo.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /jobs', async () => {
    suAuthOn = false;
    const res = await request(server).get('/system-updater/jobs');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(updaterRepo.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /jobs', async () => {
    suAuthOn = false;
    const res = await request(server).post('/system-updater/jobs').send({ targetVersion: '2.0.0' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(updaterRepo.queue).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /jobs/:id/finish', async () => {
    suAuthOn = false;
    const res = await request(server)
      .post(`/system-updater/jobs/${jobId}/finish`)
      .send({ status: 'completed', result: { log: 'ok' } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(updaterRepo.finish).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /jobs even with x-test-role admin header', async () => {
    suAuthOn = false;
    const res = await request(server).get('/system-updater/jobs').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(updaterRepo.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /jobs even with x-test-role admin header', async () => {
    suAuthOn = false;
    const res = await request(server)
      .post('/system-updater/jobs')
      .set('x-test-role', 'admin')
      .send({ targetVersion: '2.0.0' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(updaterRepo.queue).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /jobs/:id/finish even with x-test-role admin header', async () => {
    suAuthOn = false;
    const res = await request(server)
      .post(`/system-updater/jobs/${jobId}/finish`)
      .set('x-test-role', 'admin')
      .send({ status: 'completed', result: { log: 'ok' } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(updaterRepo.finish).not.toHaveBeenCalled();
  });

  it('POST /jobs returns 400 when query params are present', async () => {
    const res = await request(server).post('/system-updater/jobs').query({ dryRun: '1' }).send({ targetVersion: '2.0.0' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(updaterRepo.queue).not.toHaveBeenCalled();
  });

  it('POST /jobs/:id/finish returns 400 when query params are present', async () => {
    const res = await request(server)
      .post(`/system-updater/jobs/${jobId}/finish`)
      .query({ force: '1' })
      .send({ status: 'completed', result: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(updaterRepo.finish).not.toHaveBeenCalled();
  });

  it('POST /jobs queues with validated body', async () => {
    const res = await request(server).post('/system-updater/jobs').send({ targetVersion: '2.0.0' });
    expect(res.status).toBe(201);
    expect(updaterRepo.queue).toHaveBeenCalledWith('admin-1', '2.0.0', '');
  });

  it('POST /jobs/:id/finish finalizes job', async () => {
    const res = await request(server)
      .post(`/system-updater/jobs/${jobId}/finish`)
      .send({ status: 'completed', result: { log: 'ok' } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ id: jobId, status: 'completed' });
    expect(updaterRepo.finish).toHaveBeenCalledWith(jobId, 'completed', { log: 'ok' });
  });

  it('POST /jobs/:id/finish returns 400 for invalid job id', async () => {
    const res = await request(server)
      .post('/system-updater/jobs/not-a-uuid/finish')
      .send({ status: 'completed', result: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(updaterRepo.finish).not.toHaveBeenCalled();
  });

  it('POST /jobs returns validation error for short targetVersion', async () => {
    const res = await request(server).post('/system-updater/jobs').send({ targetVersion: 'x' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: { code: 'VALIDATION_ERROR' },
    });
  });

  it('POST /jobs returns 400 for unknown body keys', async () => {
    const res = await request(server).post('/system-updater/jobs').send({ targetVersion: '2.0.0', extra: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(updaterRepo.queue).not.toHaveBeenCalled();
  });

  it('POST /jobs/:id/finish returns 400 for unknown body keys', async () => {
    const res = await request(server)
      .post(`/system-updater/jobs/${jobId}/finish`)
      .send({ status: 'completed', result: {}, note: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(updaterRepo.finish).not.toHaveBeenCalled();
  });
});
