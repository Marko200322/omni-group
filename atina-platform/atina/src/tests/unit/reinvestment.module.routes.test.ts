import http from 'http';
import request from 'supertest';
import express from 'express';
import 'express-async-errors';
import { ReinvestmentModule } from '../../modules/reinvestment/reinvestment.module';
import { sendError } from '../../utils/response';
import { AppError, AuthenticationError } from '../../utils/errors';

// eslint-disable-next-line no-var
var reinvestmentService: {
  getStatus: jest.Mock;
  listOpportunities: jest.Mock;
  getOpportunity: jest.Mock;
  listInvestments: jest.Mock;
  listBudgets: jest.Mock;
  listForecasts: jest.Mock;
  runScenario: jest.Mock;
  listApprovals: jest.Mock;
  decideApproval: jest.Mock;
  listTransactions: jest.Mock;
  proposeTransaction: jest.Mock;
  listAudit: jest.Mock;
  listAlerts: jest.Mock;
  listPolicies: jest.Mock;
  patchActivePolicy: jest.Mock;
  runEngine: jest.Mock;
  dryRunYear: jest.Mock;
};

jest.mock('../../modules/reinvestment/service/reinvestment.service', () => {
  reinvestmentService = {
    getStatus: jest.fn(),
    listOpportunities: jest.fn(),
    getOpportunity: jest.fn(),
    listInvestments: jest.fn(),
    listBudgets: jest.fn(),
    listForecasts: jest.fn(),
    runScenario: jest.fn(),
    listApprovals: jest.fn(),
    decideApproval: jest.fn(),
    listTransactions: jest.fn(),
    proposeTransaction: jest.fn(),
    listAudit: jest.fn(),
    listAlerts: jest.fn(),
    listPolicies: jest.fn(),
    patchActivePolicy: jest.fn(),
    runEngine: jest.fn(),
    dryRunYear: jest.fn(),
  };
  return {
    ReinvestmentService: jest.fn().mockImplementation(() => reinvestmentService),
  };
});

let riAuthOn = true;
jest.mock('../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    if (!riAuthOn) {
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

describe('ReinvestmentModule HTTP routes', () => {
  let server: http.Server;
  const validUuid = '123e4567-e89b-12d3-a456-426614174000';

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    const m = new ReinvestmentModule();
    await m.initialize();
    app.use('/reinvestment', m.router);
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
    riAuthOn = true;
    jest.clearAllMocks();
    reinvestmentService.getStatus.mockResolvedValue({ dryRun: true, killSwitch: false });
    reinvestmentService.listOpportunities.mockResolvedValue([]);
    reinvestmentService.getOpportunity.mockResolvedValue({ id: validUuid });
    reinvestmentService.listInvestments.mockResolvedValue([]);
    reinvestmentService.listBudgets.mockResolvedValue([]);
    reinvestmentService.listForecasts.mockResolvedValue([]);
    reinvestmentService.runScenario.mockResolvedValue({ simulation: { months: [] } });
    reinvestmentService.listApprovals.mockResolvedValue([]);
    reinvestmentService.decideApproval.mockResolvedValue({ id: validUuid, status: 'approved' });
    reinvestmentService.listTransactions.mockResolvedValue([]);
    reinvestmentService.proposeTransaction.mockResolvedValue({
      transaction: { id: 'tx1', status: 'simulated' },
      duplicate: false,
    });
    reinvestmentService.listAudit.mockResolvedValue([]);
    reinvestmentService.listAlerts.mockResolvedValue([]);
    reinvestmentService.listPolicies.mockResolvedValue([{ dryRun: true }]);
    reinvestmentService.patchActivePolicy.mockResolvedValue({ dryRun: true, autonomyLevel: 0 });
    reinvestmentService.runEngine.mockResolvedValue({ dryRun: true });
    reinvestmentService.dryRunYear.mockResolvedValue({ dryRun: true });
  });

  it('GET /status returns 200 for admin', async () => {
    const res = await request(server).get('/reinvestment/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(reinvestmentService.getStatus).toHaveBeenCalled();
  });

  it('GET /status returns 403 for non-admin', async () => {
    const res = await request(server).get('/reinvestment/status').set('x-test-role', 'user');
    expect(res.status).toBe(403);
    expect(reinvestmentService.getStatus).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated GET /status', async () => {
    riAuthOn = false;
    const res = await request(server).get('/reinvestment/status');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /opportunities validates unknown query keys', async () => {
    const res = await request(server).get('/reinvestment/opportunities').query({ limit: '10', extra: '1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(reinvestmentService.listOpportunities).not.toHaveBeenCalled();
  });

  it('GET /opportunities/:id rejects non-uuid', async () => {
    const res = await request(server).get('/reinvestment/opportunities/not-a-uuid');
    expect(res.status).toBe(400);
    expect(reinvestmentService.getOpportunity).not.toHaveBeenCalled();
  });

  it('POST /transactions proposes with valid body', async () => {
    const res = await request(server)
      .post('/reinvestment/transactions')
      .send({
        idempotencyKey: 'ri:test:key:001',
        sourceAccountCode: 'system',
        destinationAccountCode: 'marketing',
        amountCents: 1000,
        purpose: 'reinvest',
      });
    expect(res.status).toBe(200);
    expect(reinvestmentService.proposeTransaction).toHaveBeenCalled();
  });

  it('POST /transactions rejects unknown body keys', async () => {
    const res = await request(server)
      .post('/reinvestment/transactions')
      .send({
        idempotencyKey: 'ri:test:key:002',
        sourceAccountCode: 'system',
        destinationAccountCode: 'marketing',
        amountCents: 1000,
        purpose: 'reinvest',
        hacker: true,
      });
    expect(res.status).toBe(400);
    expect(reinvestmentService.proposeTransaction).not.toHaveBeenCalled();
  });

  it('POST /approvals/:id/decide works', async () => {
    const res = await request(server)
      .post(`/reinvestment/approvals/${validUuid}/decide`)
      .send({ decision: 'approved', note: 'ok' });
    expect(res.status).toBe(200);
    expect(reinvestmentService.decideApproval).toHaveBeenCalledWith(
      validUuid,
      expect.objectContaining({ decision: 'approved' }),
      expect.objectContaining({ userId: 'admin-1', role: 'admin' })
    );
  });

  it('PATCH /policies/active updates settings', async () => {
    const res = await request(server)
      .patch('/reinvestment/policies/active')
      .send({ dryRun: true, killSwitch: false, autonomyLevel: 0 });
    expect(res.status).toBe(200);
    expect(reinvestmentService.patchActivePolicy).toHaveBeenCalled();
  });

  it('POST /engine/run defaults dry-run', async () => {
    const res = await request(server).post('/reinvestment/engine/run').send({});
    expect(res.status).toBe(200);
    expect(reinvestmentService.runEngine).toHaveBeenCalled();
  });

  it('POST /engine/dry-run-year works', async () => {
    const res = await request(server).post('/reinvestment/engine/dry-run-year').send({});
    expect(res.status).toBe(200);
    expect(reinvestmentService.dryRunYear).toHaveBeenCalled();
  });

  it('POST /scenarios accepts simulation params', async () => {
    const res = await request(server)
      .post('/reinvestment/scenarios')
      .send({ startingCashCents: 10000, label: 'test' });
    expect(res.status).toBe(200);
    expect(reinvestmentService.runScenario).toHaveBeenCalled();
  });

  it('GET /audit /alerts /policies /transactions /investments /budgets /forecast', async () => {
    const paths = [
      '/reinvestment/audit',
      '/reinvestment/alerts',
      '/reinvestment/policies',
      '/reinvestment/transactions',
      '/reinvestment/investments',
      '/reinvestment/budgets',
      '/reinvestment/forecast',
      '/reinvestment/approvals',
    ];
    for (const path of paths) {
      const res = await request(server).get(path);
      expect(res.status).toBe(200);
    }
  });
});
