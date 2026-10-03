import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { MonitoringModule } from '../../modules/monitoring/monitoring.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var monitoringService: {
  getOverview: jest.Mock;
  getHealth: jest.Mock;
  getServices: jest.Mock;
  getAlerts: jest.Mock;
  getIncidents: jest.Mock;
  getAttention: jest.Mock;
  getAnomalies: jest.Mock;
  getCosts: jest.Mock;
  getReinvestmentSignals: jest.Mock;
  runEngine: jest.Mock;
  patchIncident: jest.Mock;
};

jest.mock('../../modules/monitoring/service/monitoring.service', () => {
  monitoringService = {
    getOverview: jest.fn(),
    getHealth: jest.fn(),
    getServices: jest.fn(),
    getAlerts: jest.fn(),
    getIncidents: jest.fn(),
    getAttention: jest.fn(),
    getAnomalies: jest.fn(),
    getCosts: jest.fn(),
    getReinvestmentSignals: jest.fn(),
    runEngine: jest.fn(),
    patchIncident: jest.fn(),
  };
  return {
    MonitoringService: jest.fn().mockImplementation(() => monitoringService),
  };
});

let monAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!monAuthOn) {
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

describe('MonitoringModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new MonitoringModule();
    await m.initialize();
    app.use('/monitoring', m.router);
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
    monAuthOn = true;
    jest.clearAllMocks();
    monitoringService.getOverview.mockResolvedValue({
      overall: { state: 'OPERATIONAL', reasons: ['all_probed_subsystems_healthy'] },
      openIncidents: 0,
    });
  });

  it('requires auth on GET /overview', async () => {
    monAuthOn = false;
    const res = await request(server).get('/monitoring/overview');
    expect(res.status).toBe(401);
    expect(monitoringService.getOverview).not.toHaveBeenCalled();
  });

  it('requires admin on GET /overview', async () => {
    const res = await request(server).get('/monitoring/overview').set('x-test-role', 'client');
    expect(res.status).toBe(403);
    expect(monitoringService.getOverview).not.toHaveBeenCalled();
  });

  it('returns overview for admin', async () => {
    const res = await request(server).get('/monitoring/overview').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(monitoringService.getOverview).toHaveBeenCalled();
  });
});
