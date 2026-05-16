import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { TitanMonitorModule } from '../../../../modules/titan-monitor/titan-monitor.module';
import { sendError } from '../../../../utils/response';
import { AppError, AuthenticationError } from '../../../../utils/errors';

// eslint-disable-next-line no-var
var titanMonitorRepo: { snapshot: jest.Mock };

jest.mock('../../../../modules/titan-monitor/repository/titan-monitor.repository', () => {
  titanMonitorRepo = {
    snapshot: jest.fn().mockResolvedValue({
      activeUsers: 5,
      totalRevenue: 100,
      activeTasks: 1,
      activeEcosystems: 2,
    }),
  };
  return {
    TitanMonitorRepository: jest.fn().mockImplementation(() => titanMonitorRepo),
  };
});

let tmAuthOn = true;
jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!tmAuthOn) {
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

describe('TitanMonitorModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new TitanMonitorModule();
    await m.initialize();
    app.use('/titan-monitor', m.router);
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
    tmAuthOn = true;
    jest.clearAllMocks();
    titanMonitorRepo.snapshot.mockResolvedValue({
      activeUsers: 5,
      totalRevenue: 100,
      activeTasks: 1,
      activeEcosystems: 2,
    });
  });

  it('GET /snapshot returns 400 when JSON body has unknown keys', async () => {
    const res = await request(server)
      .get('/titan-monitor/snapshot')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ debug: true }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanMonitorRepo.snapshot).not.toHaveBeenCalled();
  });

  it('GET /snapshot returns 400 when query params are present', async () => {
    const res = await request(server).get('/titan-monitor/snapshot').query({ refresh: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(titanMonitorRepo.snapshot).not.toHaveBeenCalled();
  });

  it('GET /snapshot returns 403 for non-admin', async () => {
    const res = await request(server).get('/titan-monitor/snapshot').set('x-test-role', 'user');
    expect(res.status).toBe(403);
    expect(titanMonitorRepo.snapshot).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /snapshot', async () => {
    tmAuthOn = false;
    const res = await request(server).get('/titan-monitor/snapshot');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanMonitorRepo.snapshot).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /snapshot even with x-test-role admin header', async () => {
    tmAuthOn = false;
    const res = await request(server).get('/titan-monitor/snapshot').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(titanMonitorRepo.snapshot).not.toHaveBeenCalled();
  });

  it('GET /snapshot returns monitor payload with healthScore', async () => {
    const res = await request(server).get('/titan-monitor/snapshot');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(res.body.data).toMatchObject({
      activeUsers: 5,
      totalRevenue: 100,
      activeTasks: 1,
      activeEcosystems: 2,
    });
    expect(typeof res.body.data.healthScore).toBe('number');
    expect(typeof res.body.data.monitoredAt).toBe('string');
    expect(titanMonitorRepo.snapshot).toHaveBeenCalled();
  });
});
