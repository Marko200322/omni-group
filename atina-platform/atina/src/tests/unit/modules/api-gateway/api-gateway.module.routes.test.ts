import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { ApiGatewayModule } from '../../../../modules/api-gateway/api-gateway.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var apiGatewayRepo: {
  register: jest.Mock;
  list: jest.Mock;
  getByKey: jest.Mock;
};

jest.mock('../../../../modules/api-gateway/repository/api-gateway.repository', () => {
  apiGatewayRepo = {
    register: jest.fn().mockResolvedValue({ rows: [{ id: 'g1', route_key: 'orders.sync' }], rowCount: 1 }),
    list: jest.fn().mockResolvedValue({ rows: [{ route_key: 'orders.sync' }], rowCount: 1 }),
    getByKey: jest.fn().mockResolvedValue({
      rows: [
        {
          route_key: 'orders.sync',
          upstream_slug: 'orders',
          path_template: '/v1/sync',
          method: 'POST',
          rate_limit_per_minute: 100,
        },
      ],
      rowCount: 1,
    }),
  };
  return {
    ApiGatewayRepository: jest.fn().mockImplementation(() => apiGatewayRepo),
  };
});

let agAuthOn = true;
jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!agAuthOn) {
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

describe('ApiGatewayModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new ApiGatewayModule();
    await m.initialize();
    app.use('/api-gateway', m.router);
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
    agAuthOn = true;
    jest.clearAllMocks();
    apiGatewayRepo.register.mockResolvedValue({ rows: [{ id: 'g1', route_key: 'orders.sync' }], rowCount: 1 });
    apiGatewayRepo.list.mockResolvedValue({ rows: [{ route_key: 'orders.sync' }], rowCount: 1 });
    apiGatewayRepo.getByKey.mockResolvedValue({
      rows: [
        {
          route_key: 'orders.sync',
          upstream_slug: 'orders',
          path_template: '/v1/sync',
          method: 'POST',
          rate_limit_per_minute: 100,
        },
      ],
      rowCount: 1,
    });
  });

  it('GET /routes returns gateway rows', async () => {
    const res = await request(server).get('/api-gateway/routes');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(res.body.data).toHaveLength(1);
    expect(apiGatewayRepo.list).toHaveBeenCalled();
  });

  it('POST /routes accepts valid body and returns 201', async () => {
    const res = await request(server)
      .post('/api-gateway/routes')
      .send({
        routeKey: 'orders.sync',
        upstreamSlug: 'orders',
        pathTemplate: '/v1/sync',
        method: 'POST',
        rateLimitPerMinute: 200,
      });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(apiGatewayRepo.register).toHaveBeenCalledWith('orders.sync', 'orders', '/v1/sync', 'POST', 200);
  });

  it('POST /routes returns validation error when routeKey is too short', async () => {
    const res = await request(server)
      .post('/api-gateway/routes')
      .send({ routeKey: 'ab', upstreamSlug: 'ab', pathTemplate: '/x' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, error: { code: 'VALIDATION_ERROR' } });
    expect(apiGatewayRepo.register).not.toHaveBeenCalled();
  });

  it('POST /proxy returns 200 when route exists', async () => {
    const res = await request(server)
      .post('/api-gateway/proxy')
      .send({ routeKey: 'orders.sync', payload: { k: 1 } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ operation: 'proxy', routeKey: 'orders.sync' });
    expect(apiGatewayRepo.getByKey).toHaveBeenCalledWith('orders.sync');
  });

  it('POST /proxy returns validation error when routeKey is too short', async () => {
    const res = await request(server).post('/api-gateway/proxy').send({ routeKey: 'ab' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(apiGatewayRepo.getByKey).not.toHaveBeenCalled();
  });

  it('GET /api-gateway/routes returns 400 when query params are present', async () => {
    const res = await request(server).get('/api-gateway/routes').query({ v: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(apiGatewayRepo.list).not.toHaveBeenCalled();
  });

  it('GET /api-gateway/routes returns 400 when body is not strictly empty', async () => {
    const res = await request(server).get('/api-gateway/routes').send({ x: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(apiGatewayRepo.list).not.toHaveBeenCalled();
  });

  it('POST /api-gateway/routes returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/api-gateway/routes')
      .query({ draft: '1' })
      .send({
        routeKey: 'orders.sync',
        upstreamSlug: 'orders',
        pathTemplate: '/v1/sync',
        method: 'POST',
        rateLimitPerMinute: 200,
      });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(apiGatewayRepo.register).not.toHaveBeenCalled();
  });

  it('POST /api-gateway/proxy returns 400 when query params are present', async () => {
    const res = await request(server)
      .post('/api-gateway/proxy')
      .query({ x: '1' })
      .send({ routeKey: 'orders.sync', payload: {} });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(apiGatewayRepo.getByKey).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /api-gateway/routes', async () => {
    agAuthOn = false;
    const res = await request(server).get('/api-gateway/routes');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(apiGatewayRepo.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /api-gateway/routes', async () => {
    agAuthOn = false;
    const res = await request(server)
      .post('/api-gateway/routes')
      .send({
        routeKey: 'orders.sync',
        upstreamSlug: 'orders',
        pathTemplate: '/v1/sync',
        method: 'POST',
        rateLimitPerMinute: 200,
      });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(apiGatewayRepo.register).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /api-gateway/proxy', async () => {
    agAuthOn = false;
    const res = await request(server)
      .post('/api-gateway/proxy')
      .send({ routeKey: 'orders.sync', payload: { k: 1 } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(apiGatewayRepo.getByKey).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /api-gateway/routes even with x-test-role admin header', async () => {
    agAuthOn = false;
    const res = await request(server).get('/api-gateway/routes').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(apiGatewayRepo.list).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /api-gateway/routes even with x-test-role admin header', async () => {
    agAuthOn = false;
    const res = await request(server)
      .post('/api-gateway/routes')
      .set('x-test-role', 'admin')
      .send({
        routeKey: 'orders.sync',
        upstreamSlug: 'orders',
        pathTemplate: '/v1/sync',
        method: 'POST',
        rateLimitPerMinute: 200,
      });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(apiGatewayRepo.register).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated POST /api-gateway/proxy even with x-test-role admin header', async () => {
    agAuthOn = false;
    const res = await request(server)
      .post('/api-gateway/proxy')
      .set('x-test-role', 'admin')
      .send({ routeKey: 'orders.sync', payload: { k: 1 } });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(apiGatewayRepo.getByKey).not.toHaveBeenCalled();
  });
});
