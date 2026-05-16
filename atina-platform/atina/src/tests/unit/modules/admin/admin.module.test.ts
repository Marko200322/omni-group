import { AdminModule } from '../../../../modules/admin/admin.module';
import express from 'express';
import request from 'supertest';
import * as db from '../../../../database/connection';
import type { JwtPayload } from '../../../../api/middleware/auth.middleware';
import { getForgeHealthDetails } from '../../../../modules/forge/service/forge-health.service';
import { sendError } from '../../../../utils/response';
import { AppError } from '../../../../utils/errors';

jest.mock('../../../../database/connection');
let authEnabled = true;
let adminEnabled = true;
jest.mock('../../../../modules/forge/service/forge-health.service', () => ({
  getForgeHealthDetails: jest.fn(),
}));
jest.mock('../../../../api/middleware/auth.middleware', () => ({
  authenticate: (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!authEnabled) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTHENTICATION_ERROR', message: 'No authentication token provided' },
      });
    }
    const mockUser: JwtPayload = {
      userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      email: 'admin@test.com',
      role: 'admin',
    };
    req.user = mockUser;
    next();
  },
  requireAdmin: (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!adminEnabled) {
      return res.status(403).json({
        success: false,
        error: { code: 'AUTHORIZATION_ERROR', message: 'Insufficient permissions' },
      });
    }
    next();
  },
}));
jest.mock('../../../../modules/phase-launch/middleware/phase-activation.middleware', () => ({
  getCurrentPhase: jest.fn(async () => 'v2'),
  getModulePhaseGatingStatus: jest.fn(() => [
    { moduleSlug: 'craftor', requiredPhase: 'v1', unlocked: true },
    { moduleSlug: 'dominus360', requiredPhase: 'v2', unlocked: true },
    { moduleSlug: 'atina-system', requiredPhase: 'v3', unlocked: false },
    { moduleSlug: 'sistem-naplate', requiredPhase: 'v3', unlocked: false },
    { moduleSlug: 'forge', requiredPhase: 'v3', unlocked: false },
  ]),
  getModulePhaseRequirements: jest.fn(() => ({
    craftor: 'v1',
    dominus360: 'v2',
    'atina-system': 'v3',
    'sistem-naplate': 'v3',
    forge: 'v3',
  })),
  getPhaseOrder: jest.fn(() => ['v1', 'v2', 'v3', 'v4', 'v5', 'v6']),
}));

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;
const getForgeHealthDetailsMock = getForgeHealthDetails as jest.MockedFunction<typeof getForgeHealthDetails>;

const expectExactObjectKeys = (value: Record<string, unknown>, expectedKeys: string[]) => {
  expect(Object.keys(value).sort()).toEqual([...expectedKeys].sort());
};

describe('AdminModule', () => {
  const expectSuccessSchema = (body: Record<string, unknown>) => {
    expect(body).toMatchObject({
      success: true,
      message: expect.any(String),
    });
    expect(body).toHaveProperty('data');
    expect(body).not.toHaveProperty('error');
  };

  beforeEach(() => {
    authEnabled = true;
    adminEnabled = true;
    mockQuery.mockReset();
    getForgeHealthDetailsMock.mockReset();
    getForgeHealthDetailsMock.mockResolvedValue({
      vaultPath: 'C:/tmp/test-forge-vault.db',
      vaultSignal: 'available',
      lastForgeEventAgeMs: 1200,
      lastForgeEventFresh: true,
    });
  });

  it('initialize then shutdown completes', async () => {
    const m = new AdminModule();
    await m.initialize();
    await expect(m.shutdown()).resolves.toBeUndefined();
  });

  it('registers workflow template execution stats admin route', async () => {
    const m = new AdminModule();
    await m.initialize();

    const stack = (m.router as any).stack ?? [];
    const hasRoute = stack.some((layer: any) => {
      const path = layer?.route?.path;
      const hasGet = Boolean(layer?.route?.methods?.get);
      return path === '/workflow/templates/execution-stats' && hasGet;
    });

    expect(hasRoute).toBe(true);
  });

  it('GET /workflow/templates/execution-stats returns template summary and alerts', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("FROM tasks t") && sql.includes("t.type = 'workflow_chain_execution'")) {
        if (sql.includes('period_bucket')) {
          return {
            rows: [
              {
                template_key: 'ecosystem-hunt-to-conversion',
                period_bucket: 'current',
                total_runs: '10',
                completed_runs: '6',
              },
              {
                template_key: 'ecosystem-hunt-to-conversion',
                period_bucket: 'previous',
                total_runs: '10',
                completed_runs: '8',
              },
            ],
            rowCount: 2,
          } as any;
        }
        return {
          rows: [
            {
              template_key: 'ecosystem-hunt-to-conversion',
              total_runs: '10',
              completed_runs: '6',
              failed_runs: '4',
            },
            {
              template_key: 'new-template-key',
              total_runs: '5',
              completed_runs: '5',
              failed_runs: '0',
            },
          ],
          rowCount: 2,
        } as any;
      }
      return { rows: [], rowCount: 0 } as any;
    });

    const m = new AdminModule();
    await m.initialize();
    const app = express();
    app.use('/api/v1/admin', m.router);

    const res = await request(app)
      .get('/api/v1/admin/workflow/templates/execution-stats')
      .query({ days: 7 });

    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data.days).toBe(7);
    expect(res.body.data.templates).toEqual([
      {
        templateKey: 'ecosystem-hunt-to-conversion',
        totalRuns: 10,
        completedRuns: 6,
        failedRuns: 4,
        successRate: 60,
      },
      {
        templateKey: 'new-template-key',
        totalRuns: 5,
        completedRuns: 5,
        failedRuns: 0,
        successRate: 100,
      },
    ]);
    expect(res.body.data.summary).toMatchObject({
      totalTemplates: 2,
      totalRuns: 15,
      completedRuns: 11,
      failedRuns: 4,
      successRate: 73.33,
    });
    expect(res.body.data.alerts).toMatchObject({
      contractVersion: '2026-04-ops-v1',
      threshold: 80,
      periodDays: 7,
      totalTemplatesEvaluated: 2,
      totalAlertedTemplates: 1,
      hasCriticalAlerts: false,
    });
    expect(res.body.data.alerts.templates[0]).toMatchObject({
      templateKey: 'ecosystem-hunt-to-conversion',
      alert: true,
      severity: 'high',
      trendDirection: 'worsening',
    });
    expectExactObjectKeys(res.body.data, ['days', 'templates', 'summary', 'alerts', 'monitoring']);
    expectExactObjectKeys(res.body.data.templates[0], [
      'templateKey',
      'totalRuns',
      'completedRuns',
      'failedRuns',
      'successRate',
    ]);
    expectExactObjectKeys(res.body.data.summary, [
      'totalTemplates',
      'totalRuns',
      'completedRuns',
      'failedRuns',
      'successRate',
    ]);
    expectExactObjectKeys(res.body.data.alerts, [
      'contractVersion',
      'threshold',
      'periodDays',
      'totalTemplatesEvaluated',
      'totalAlertedTemplates',
      'alertRate',
      'highCount',
      'mediumCount',
      'lowCount',
      'hasCriticalAlerts',
      'severity',
      'totals',
      'consistency',
      'templates',
    ]);
    expectExactObjectKeys(res.body.data.alerts.severity, [
      'hasCriticalAlerts',
      'counts',
    ]);
    expectExactObjectKeys(res.body.data.alerts.severity.counts, [
      'highCount',
      'mediumCount',
      'lowCount',
    ]);
    expectExactObjectKeys(res.body.data.alerts.totals, [
      'totalTemplates',
      'totalRuns',
      'completedRuns',
      'failedRuns',
      'successRate',
    ]);
    expectExactObjectKeys(res.body.data.alerts.consistency, [
      'severityCountsMatchTemplates',
      'totalsMatchTemplates',
      'alertRateMatchesCounts',
      'criticalFlagMatchesTemplates',
    ]);
    expectExactObjectKeys(res.body.data.alerts.templates[0], [
      'templateKey',
      'periodDays',
      'totalRuns',
      'completedRuns',
      'failedRuns',
      'successRate',
      'threshold',
      'gapToThreshold',
      'trendDirection',
      'severity',
      'alert',
    ]);
    expect(res.body.data.monitoring).toMatchObject({
      contractVersion: '2026-04-ops-v1',
      generatedAt: expect.any(String),
      checks: {
        workflowTemplateAlertConsistency: true,
      },
    });
  });

  it('GET /overview includes workflow template summary quick status fields', async () => {
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('SUM(CASE WHEN is_active THEN 1') && sql.includes('FROM users')) {
        return { rows: [{ count: '2', active: '1' }], rowCount: 1 } as any;
      }
      if (sql.includes('FROM subscriptions') && sql.includes("status = 'active'")) {
        return { rows: [{ count: '2', active: '1' }], rowCount: 1 } as any;
      }
      if (sql.includes("FROM payments WHERE status = 'completed'")) {
        return { rows: [{ count: '1', total_revenue: '9.99' }], rowCount: 1 } as any;
      }
      if (sql.includes('FROM tasks') && sql.includes("SUM(CASE WHEN status = 'failed'")) {
        return { rows: [{ count: '20', failed: '2' }], rowCount: 1 } as any;
      }
      if (sql.includes('FROM logs') && sql.includes("INTERVAL '24 hours'")) {
        return { rows: [{ count: '4' }], rowCount: 1 } as any;
      }
      if (sql.includes("COALESCE(t.payload->>'templateKey', 'manual') AS template_key") && sql.includes("INTERVAL '30 days'")) {
        return {
          rows: [{ template_key: 'template-a', total_runs: '8', completed_runs: '7', failed_runs: '1' }],
          rowCount: 1,
        } as any;
      }
      if (sql.includes('DATE(t.created_at)::text AS run_date') && sql.includes("INTERVAL '7 days'") && !sql.includes('template_key,')) {
        return { rows: [], rowCount: 0 } as any;
      }
      if (sql.includes('DATE(t.created_at)::text AS run_date') && sql.includes('template_key')) {
        return {
          rows: [
            { template_key: 'template-a', run_date: '2026-03-29', total_runs: '4', completed_runs: '3', failed_runs: '1' },
            { template_key: 'template-a', run_date: '2026-03-30', total_runs: '4', completed_runs: '2', failed_runs: '2' },
          ],
          rowCount: 2,
        } as any;
      }
      if (sql.includes('SUM(es.budget_allocated)') && sql.includes('FROM ecosystem_systems es')) {
        return {
          rows: [{ total_budget_allocated: '1000', total_spent: '250' }],
          rowCount: 1,
        } as any;
      }
      if (sql.includes("NULLIF(TRIM(er.output_payload->>'provider'), '') AS provider")) {
        return {
          rows: [{ provider: 'atina', runs: '3' }],
          rowCount: 1,
        } as any;
      }
      if (sql.includes("FROM ecosystem_runs er") && sql.includes("er.run_type LIKE 'forge_%'") && sql.includes('COUNT(*)::text AS count')) {
        return {
          rows: [{ count: '6' }],
          rowCount: 1,
        } as any;
      }
      return { rows: [], rowCount: 0 } as any;
    });

    const m = new AdminModule();
    await m.initialize();
    const app = express();
    app.use('/api/v1/admin', m.router);

    const res = await request(app).get('/api/v1/admin/overview');

    expect(res.status).toBe(200);
    expect(res.body.data.workflowTemplatesExecutionSummary).toMatchObject({
      totalTemplates: 1,
      totalRuns: 8,
      completedRuns: 7,
      failedRuns: 1,
      successRate: 87.5,
    });
    expect(res.body.data.workflowTemplateAlerts).toMatchObject({
      contractVersion: '2026-04-ops-v1',
      totalTemplatesEvaluated: 1,
      totalAlertedTemplates: 1,
      highCount: 1,
      mediumCount: 0,
      lowCount: 0,
      hasCriticalAlerts: false,
      severity: {
        hasCriticalAlerts: false,
        counts: {
          highCount: 1,
          mediumCount: 0,
          lowCount: 0,
        },
      },
      consistency: {
        severityCountsMatchTemplates: true,
        totalsMatchTemplates: true,
        alertRateMatchesCounts: true,
        criticalFlagMatchesTemplates: true,
      },
    });
    expect(res.body.data.workflowTemplateAlerts.templates[0]).toMatchObject({
      templateKey: 'template-a',
      trendDirection: 'worsening',
      severity: 'high',
    });
    expect(res.body.data.workflowTemplateTopFailing).toEqual([
      {
        templateKey: 'template-a',
        totalRuns: 8,
        completedRuns: 5,
        failedRuns: 3,
        failureRate: 37.5,
      },
    ]);
    expect(res.body.data.workflowTemplateMetricsConsistency).toEqual({
      contractVersion: '2026-04-ops-v1',
      topFailingTemplatesConsistentWithTrend: true,
      trendCoverageComplete: true,
      trendTotalsMatchByKey: true,
    });
    expect(res.body.data.monitoring).toMatchObject({
      contractVersion: '2026-04-ops-v1',
      generatedAt: expect.any(String),
      checks: {
        workflowTemplateAlertConsistency: true,
        workflowTemplateTrendConsistency: true,
      },
    });
    expect(res.body.data.atinaForgeKpis).toEqual({
      forgeRuns24h: 6,
      budgetBurn: {
        allocatedRsd: 1000,
        spentRsd: 250,
        remainingRsd: 750,
        burnPercent: 25,
      },
      topProvider: {
        provider: 'atina',
        runs: 3,
        sharePercent: 50,
      },
    });
    expect(Array.isArray(res.body.data.registeredModuleSlugs)).toBe(true);
    expect(res.body.data.registeredModuleSlugs).toEqual(
      res.body.data.modules.map((m: { slug: string }) => m.slug)
    );
    expect(res.body.data.registeredModules).toEqual({
      slugs: res.body.data.registeredModuleSlugs,
      count: res.body.data.modules.length,
    });
  });

  it('GET /phase-gating returns stable summary counts and per-phase buckets', async () => {
    const m = new AdminModule();
    await m.initialize();
    const app = express();
    app.use('/api/v1/admin', m.router);

    const res = await request(app).get('/api/v1/admin/phase-gating');

    expect(res.status).toBe(200);
    expect(res.body.data.currentPhase).toBe('v2');
    expect(res.body.data.requirements).toMatchObject({
      'atina-system': 'v3',
      'sistem-naplate': 'v3',
      forge: 'v3',
    });
    expect(res.body.data.summary).toEqual({
      counts: {
        totalModules: 5,
        unlockedModules: 2,
        lockedModules: 3,
      },
      totalModules: 5,
      unlockedModules: 2,
      lockedModules: 3,
      byPhase: [
        { phase: 'v1', totalModules: 1, unlockedModules: 1, lockedModules: 0 },
        { phase: 'v2', totalModules: 1, unlockedModules: 1, lockedModules: 0 },
        { phase: 'v3', totalModules: 3, unlockedModules: 0, lockedModules: 3 },
        { phase: 'v4', totalModules: 0, unlockedModules: 0, lockedModules: 0 },
        { phase: 'v5', totalModules: 0, unlockedModules: 0, lockedModules: 0 },
        { phase: 'v6', totalModules: 0, unlockedModules: 0, lockedModules: 0 },
      ],
    });
  });

  it('GET /health includes forge vault signal and freshness', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 } as never);

    const m = new AdminModule();
    await m.initialize();
    const app = express();
    app.use('/api/v1/admin', m.router);

    const res = await request(app).get('/api/v1/admin/health');

    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data.forge).toEqual({
      vaultPath: 'C:/tmp/test-forge-vault.db',
      vaultSignal: 'available',
      lastForgeEventAgeMs: 1200,
      lastForgeEventFresh: true,
    });
    expect(res.body.data).toMatchObject({
      contractVersion: '2026-04-ops-v1',
      checks: {
        databaseReachable: true,
        forgeVaultReachable: true,
        forgeEventsFresh: true,
      },
    });
    expect(typeof res.body.data.timestamp).toBe('string');
  });

  it('GET /health uses safe forge fallback when diagnostics fail', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 } as never);
    getForgeHealthDetailsMock.mockRejectedValueOnce(new Error('vault unavailable'));

    const m = new AdminModule();
    await m.initialize();
    const app = express();
    app.use('/api/v1/admin', m.router);

    const res = await request(app).get('/api/v1/admin/health');

    expect(res.status).toBe(200);
    expectSuccessSchema(res.body);
    expect(res.body.data.forge).toEqual({
      vaultPath: null,
      vaultSignal: 'unavailable',
      lastForgeEventAgeMs: null,
      lastForgeEventFresh: null,
    });
    expect(res.body.data.checks).toEqual({
      databaseReachable: true,
      forgeVaultReachable: false,
      forgeEventsFresh: false,
    });
  });

  it('GET /overview returns 401 when unauthenticated', async () => {
    authEnabled = false;
    const m = new AdminModule();
    await m.initialize();
    const app = express();
    app.use('/api/v1/admin', m.router);

    const res = await request(app).get('/api/v1/admin/overview');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /overview returns 401 when unauthenticated even with x-test-role admin header', async () => {
    authEnabled = false;
    const m = new AdminModule();
    await m.initialize();
    const app = express();
    app.use('/api/v1/admin', m.router);

    const res = await request(app).get('/api/v1/admin/overview').set('x-test-role', 'admin');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
  });

  it('GET /overview returns 403 when user is not admin', async () => {
    adminEnabled = false;
    const m = new AdminModule();
    await m.initialize();
    const app = express();
    app.use('/api/v1/admin', m.router);

    const res = await request(app).get('/api/v1/admin/overview');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
  });

  it('GET /workflow/templates/execution-stats returns 400 for invalid query bounds', async () => {
    const m = new AdminModule();
    await m.initialize();
    const app = express();
    app.use('/api/v1/admin', m.router);
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      if (err instanceof AppError) {
        return sendError(res, err.message, err.statusCode, err.code, err.details);
      }
      return sendError(res, err.message || 'Error', 500);
    });

    const res = await request(app)
      .get('/api/v1/admin/workflow/templates/execution-stats')
      .query({ days: 0, templateKey: 'bad key!' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
