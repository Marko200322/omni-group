import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { LoadBalancerModule } from '../../../../modules/load-balancer/load-balancer.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var loadBalancerRepo: {
  register: jest.Mock;
  listActive: jest.Mock;
  addLoad: jest.Mock;
};

jest.mock('../../../../modules/load-balancer/repository/load-balancer.repository', () => {
  loadBalancerRepo = {
    register: jest.fn().mockResolvedValue({ rows: [{ id: 'n-new', node_name: 'worker' }], rowCount: 1 }),
    listActive: jest.fn().mockResolvedValue({
      rows: [{ id: 'n1', node_name: 'a', zone: 'z', capacity_score: 10, current_load_score: 0, is_active: true }],
      rowCount: 1,
    }),
    addLoad: jest.fn().mockResolvedValue({
      rows: [{ id: 'n1', node_name: 'a', zone: 'z', capacity_score: 10, current_load_score: 3, is_active: true }],
      rowCount: 1,
    }),
  };
  return {
    LoadBalancerRepository: jest.fn().mockImplementation(() => loadBalancerRepo),
  };
});

let lbAuthOn = true;
jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!lbAuthOn) {
      throw new AuthenticationError('No authentication token provided');
    }
    (req as express.Request & { user?: { userId: string; role: string; email: string } }).user = {
      userId: 'admin-1',
      role: 'admin',
      email: 'admin@test.com',
    };
    next();
  },
  requireAdmin: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

describe('LoadBalancerModule HTTP routes (edge)', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new LoadBalancerModule();
    await m.initialize();
    app.use('/load-balancer', m.router);
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
    lbAuthOn = true;
    jest.clearAllMocks();
    loadBalancerRepo.register.mockResolvedValue({ rows: [{ id: 'n-new', node_name: 'worker' }], rowCount: 1 });
    loadBalancerRepo.listActive.mockResolvedValue({
      rows: [{ id: 'n1', node_name: 'a', zone: 'z', capacity_score: 10, current_load_score: 0, is_active: true }],
      rowCount: 1,
    });
    loadBalancerRepo.addLoad.mockResolvedValue({
      rows: [{ id: 'n1', node_name: 'a', zone: 'z', capacity_score: 10, current_load_score: 3, is_active: true }],
      rowCount: 1,
    });
  });

  it('GET /nodes returns active nodes', async () => {
    const res = await request(server).get('/load-balancer/nodes');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(res.body.data).toHaveLength(1);
    expect(loadBalancerRepo.listActive).toHaveBeenCalled();
  });

  it('POST /nodes accepts valid body and returns 201', async () => {
    const res = await request(server)
      .post('/load-balancer/nodes')
      .send({ nodeName: 'worker-east', zone: 'eu-west', capacityScore: 50, metadata: { tier: 'prod' } });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(loadBalancerRepo.register).toHaveBeenCalledWith('worker-east', 'eu-west', 50, { tier: 'prod' });
  });

  it('POST /nodes returns validation error when nodeName is too short', async () => {
    const res = await request(server).post('/load-balancer/nodes').send({ nodeName: 'x', zone: 'eu', capacityScore: 10 });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(loadBalancerRepo.register).not.toHaveBeenCalled();
  });

  it('POST /dispatch returns validation error when workloadKey is too short', async () => {
    const res = await request(server).post('/load-balancer/dispatch').send({ workloadKey: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(loadBalancerRepo.addLoad).not.toHaveBeenCalled();
  });

  it('POST /dispatch returns 404 when no active nodes', async () => {
    loadBalancerRepo.listActive.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const res = await request(server).post('/load-balancer/dispatch').send({ workloadKey: 'job-01' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(loadBalancerRepo.addLoad).not.toHaveBeenCalled();
  });

  it('POST /dispatch returns 200 when a node is available', async () => {
    const res = await request(server).post('/load-balancer/dispatch').send({ workloadKey: 'job-01' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ workloadKey: 'job-01' });
    expect(loadBalancerRepo.addLoad).toHaveBeenCalled();
  });

  it('GET /load-balancer/nodes returns 400 when query params are present', async () => {
    const res = await request(server).get('/load-balancer/nodes').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(loadBalancerRepo.listActive).not.toHaveBeenCalled();
  });

  it('GET /load-balancer/nodes returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/load-balancer/nodes').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(loadBalancerRepo.listActive).not.toHaveBeenCalled();
  });

  it('POST /load-balancer/nodes returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/load-balancer/nodes')
      .query({ zone: 'x' })
      .send({ nodeName: 'worker-east', zone: 'eu-west', capacityScore: 50 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(loadBalancerRepo.register).not.toHaveBeenCalled();
  });

  it('POST /load-balancer/dispatch returns 400 when query params are present', async () => {
    const res = await request(server).post('/load-balancer/dispatch').query({ x: '1' }).send({ workloadKey: 'job-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(loadBalancerRepo.addLoad).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /load-balancer/nodes', async () => {
    lbAuthOn = false;
    const res = await request(server).get('/load-balancer/nodes');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(loadBalancerRepo.listActive).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /load-balancer/nodes', async () => {
    lbAuthOn = false;
    const res = await request(server)
      .post('/load-balancer/nodes')
      .send({ nodeName: 'worker-east', zone: 'eu-west', capacityScore: 50, metadata: { tier: 'prod' } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(loadBalancerRepo.register).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /load-balancer/dispatch', async () => {
    lbAuthOn = false;
    const res = await request(server).post('/load-balancer/dispatch').send({ workloadKey: 'job-01' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(loadBalancerRepo.addLoad).not.toHaveBeenCalled();
    expect(loadBalancerRepo.listActive).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /load-balancer/nodes even with x-test-role admin header', async () => {
    lbAuthOn = false;
    const res = await request(server).get('/load-balancer/nodes').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(loadBalancerRepo.listActive).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /load-balancer/nodes even with x-test-role admin header', async () => {
    lbAuthOn = false;
    const res = await request(server)
      .post('/load-balancer/nodes')
      .set('x-test-role', 'admin')
      .send({ nodeName: 'worker-east', zone: 'eu-west', capacityScore: 50, metadata: { tier: 'prod' } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(loadBalancerRepo.register).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /load-balancer/dispatch even with x-test-role admin header', async () => {
    lbAuthOn = false;
    const res = await request(server).post('/load-balancer/dispatch').set('x-test-role', 'admin').send({ workloadKey: 'job-01' });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(loadBalancerRepo.addLoad).not.toHaveBeenCalled();
    expect(loadBalancerRepo.listActive).not.toHaveBeenCalled();
  });
});
