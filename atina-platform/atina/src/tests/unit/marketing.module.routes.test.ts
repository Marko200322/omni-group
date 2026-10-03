import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { MarketingModule } from '../../modules/marketing/marketing.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var marketingService: {
  getOverview: jest.Mock;
  getHealth: jest.Mock;
  getChannels: jest.Mock;
  getCampaigns: jest.Mock;
  getFunnel: jest.Mock;
  getAttribution: jest.Mock;
  getEconomics: jest.Mock;
  getBudgets: jest.Mock;
  getExperiments: jest.Mock;
  getRecommendations: jest.Mock;
  getOpportunities: jest.Mock;
  getAlerts: jest.Mock;
  getReinvestmentSignals: jest.Mock;
  getMonitoringSignals: jest.Mock;
  getEmailEngagement: jest.Mock;
  getPackageMatrix: jest.Mock;
  ingestSpendManual: jest.Mock;
  ingestCsv: jest.Mock;
  syncAdapters: jest.Mock;
  runWhatIf: jest.Mock;
  runEngine: jest.Mock;
  ingestResendWebhook: jest.Mock;
  getReconciliation: jest.Mock;
  answerOmi: jest.Mock;
  createExperiment: jest.Mock;
  attributeContact: jest.Mock;
};

jest.mock('../../modules/marketing/service/marketing.service', () => {
  marketingService = {
    getOverview: jest.fn().mockResolvedValue({ kind: 'ACTUAL', totals: {} }),
    getHealth: jest.fn().mockResolvedValue({ overall: 'warning', dimensions: [] }),
    getChannels: jest.fn().mockResolvedValue({ channels: [] }),
    getCampaigns: jest.fn().mockResolvedValue({ campaigns: [] }),
    getFunnel: jest.fn().mockResolvedValue({ stages: [] }),
    getAttribution: jest.fn().mockResolvedValue({ label: 'ATTRIBUTION_UNCERTAIN' }),
    getEconomics: jest.fn().mockResolvedValue({}),
    getBudgets: jest.fn().mockResolvedValue({ budgets: [] }),
    getExperiments: jest.fn().mockResolvedValue({ experiments: [] }),
    getRecommendations: jest.fn().mockResolvedValue({ recommendations: [] }),
    getOpportunities: jest.fn().mockResolvedValue({ opportunities: [] }),
    getAlerts: jest.fn().mockResolvedValue([]),
    getReinvestmentSignals: jest.fn().mockResolvedValue({ kind: 'ACTUAL' }),
    getMonitoringSignals: jest.fn().mockResolvedValue({ kind: 'ACTUAL' }),
    getEmailEngagement: jest.fn().mockResolvedValue({ kind: 'UNAVAILABLE', sent: 0 }),
    getPackageMatrix: jest.fn().mockResolvedValue({ kind: 'UNAVAILABLE', rows: [] }),
    ingestSpendManual: jest.fn().mockResolvedValue({ ok: true }),
    ingestCsv: jest.fn().mockResolvedValue({ ok: true }),
    syncAdapters: jest.fn().mockResolvedValue({ results: [] }),
    runWhatIf: jest.fn().mockResolvedValue({ kind: 'SCENARIO' }),
    runEngine: jest.fn().mockResolvedValue({ engineVersion: '1.0.0' }),
    ingestResendWebhook: jest.fn().mockResolvedValue({ ok: true }),
    getReconciliation: jest.fn().mockResolvedValue({}),
    answerOmi: jest.fn().mockResolvedValue({ kind: 'UNAVAILABLE' }),
    createExperiment: jest.fn().mockResolvedValue({}),
    attributeContact: jest.fn().mockResolvedValue({}),
  };
  return {
    MarketingService: jest.fn().mockImplementation(() => marketingService),
  };
});

let mktAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!mktAuthOn) {
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

describe('MarketingModule HTTP routes', () => {
  let server: http.Server;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new MarketingModule();
    await m.initialize();
    app.use('/marketing', m.router);
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
    mktAuthOn = true;
  });

  it('requires auth for GET /marketing/overview', async () => {
    mktAuthOn = false;
    const res = await request(server).get('/marketing/overview');
    expect(res.status).toBe(401);
  });

  it('returns overview for admin', async () => {
    const res = await request(server).get('/marketing/overview').set('x-test-role', 'admin');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(marketingService.getOverview).toHaveBeenCalled();
  });

  it('rejects non-admin', async () => {
    const res = await request(server).get('/marketing/overview').set('x-test-role', 'user');
    expect(res.status).toBe(403);
  });

  it('returns email engagement + package matrix for admin', async () => {
    const email = await request(server).get('/marketing/email-engagement').set('x-test-role', 'admin');
    expect(email.status).toBe(200);
    expect(marketingService.getEmailEngagement).toHaveBeenCalled();
    const pkg = await request(server).get('/marketing/package-matrix').set('x-test-role', 'admin');
    expect(pkg.status).toBe(200);
    expect(marketingService.getPackageMatrix).toHaveBeenCalled();
  });

  it('allows unauthenticated POST /marketing/webhooks/resend', async () => {
    const res = await request(server)
      .post('/marketing/webhooks/resend')
      .send({ type: 'email.opened', id: 'evt_test', data: { to: ['a@b.com'] } });
    expect(res.status).toBe(200);
    expect(marketingService.ingestResendWebhook).toHaveBeenCalled();
  });
});
