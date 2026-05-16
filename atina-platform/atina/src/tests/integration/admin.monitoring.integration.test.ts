import http from 'http';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import 'express-async-errors';
import { AdminModule } from '../../modules/admin/admin.module';
import { closePool, query } from '../../database/connection';
import { config } from '../../config';
import { AppError } from '../../utils/errors';
import { sendError } from '../../utils/response';

const TEST_ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const TEST_ADMIN_EMAIL = 'integration.admin.monitoring@atina.test';

function signAuthToken(): string {
  return jwt.sign(
    {
      userId: TEST_ADMIN_ID,
      email: TEST_ADMIN_EMAIL,
      role: 'admin',
    },
    config.jwt.secret
  );
}

async function seedAdminUser(): Promise<void> {
  await query('DELETE FROM users WHERE id = $1 OR email = $2', [TEST_ADMIN_ID, TEST_ADMIN_EMAIL]);
  await query(
    `INSERT INTO users (id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, $5)`,
    [TEST_ADMIN_ID, TEST_ADMIN_EMAIL, 'integration-hash', 'Monitoring Admin', 'admin']
  );
}

async function seedWorkflowExecutionTasks(): Promise<void> {
  await query(`DELETE FROM tasks WHERE user_id = $1 AND type = 'workflow_chain_execution'`, [TEST_ADMIN_ID]);
  await query(
    `INSERT INTO tasks (user_id, type, name, status, payload)
     VALUES
       ($1, 'workflow_chain_execution', 'Atina+Forge execution #1', 'completed', $2::jsonb),
       ($1, 'workflow_chain_execution', 'Atina+Forge execution #2', 'failed', $2::jsonb),
       ($1, 'workflow_chain_execution', 'Atina+Forge execution #3', 'completed', $2::jsonb)`,
    [TEST_ADMIN_ID, JSON.stringify({ templateKey: 'atina-forge-sync-loop' })]
  );
}

function buildTestApp() {
  const app = express();
  app.use(express.json());

  const adminModule = new AdminModule();
  app.use('/api/v1/admin', adminModule.router);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      return sendError(res, err.message, err.statusCode, err.code, err.details);
    }
    return sendError(res, err.message || 'Error', 500);
  });

  return { app, adminModule };
}

describe('Admin monitoring retrieval integration', () => {
  let server: http.Server;

  beforeAll(async () => {
    const { app, adminModule } = buildTestApp();
    await adminModule.initialize();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await closePool();
  });

  it('retrieves monitoring overview happy-path', async () => {
    await seedAdminUser();
    await seedWorkflowExecutionTasks();

    const res = await request(server)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${signAuthToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.workflowTemplatesExecutionSummary).toMatchObject({
      totalTemplates: expect.any(Number),
      totalRuns: expect.any(Number),
      completedRuns: expect.any(Number),
      failedRuns: expect.any(Number),
      successRate: expect.any(Number),
    });
    expect(res.body.data.workflowTemplatesExecution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          templateKey: 'atina-forge-sync-loop',
          totalRuns: expect.any(Number),
          completedRuns: expect.any(Number),
          failedRuns: expect.any(Number),
          successRate: expect.any(Number),
        }),
      ])
    );
    expect(res.body.data.workflowTemplateAlerts).toMatchObject({
      contractVersion: '2026-04-ops-v1',
      threshold: expect.any(Number),
      periodDays: 7,
      totalTemplatesEvaluated: expect.any(Number),
      totalAlertedTemplates: expect.any(Number),
      consistency: {
        severityCountsMatchTemplates: expect.any(Boolean),
        totalsMatchTemplates: expect.any(Boolean),
        alertRateMatchesCounts: expect.any(Boolean),
        criticalFlagMatchesTemplates: expect.any(Boolean),
      },
      templates: expect.any(Array),
    });
    expect(res.body.data.monitoring).toMatchObject({
      contractVersion: '2026-04-ops-v1',
      generatedAt: expect.any(String),
      checks: {
        workflowTemplateAlertConsistency: expect.any(Boolean),
        workflowTemplateTrendConsistency: expect.any(Boolean),
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

  it('retrieves workflow template execution-stats happy-path', async () => {
    await seedAdminUser();
    await seedWorkflowExecutionTasks();

    const res = await request(server)
      .get('/api/v1/admin/workflow/templates/execution-stats')
      .query({ days: 30, templateKey: 'atina-forge-sync-loop' })
      .set('Authorization', `Bearer ${signAuthToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      days: 30,
      templateKey: 'atina-forge-sync-loop',
      summary: {
        totalTemplates: 1,
        totalRuns: 3,
        completedRuns: 2,
        failedRuns: 1,
      },
    });
    expect(res.body.data.templates).toEqual([
      expect.objectContaining({
        templateKey: 'atina-forge-sync-loop',
        totalRuns: 3,
        completedRuns: 2,
        failedRuns: 1,
      }),
    ]);
    expect(res.body.data.alerts).toMatchObject({
      contractVersion: '2026-04-ops-v1',
      threshold: 80,
      periodDays: 30,
      totalTemplatesEvaluated: 1,
      totalAlertedTemplates: 1,
      consistency: {
        severityCountsMatchTemplates: true,
        totalsMatchTemplates: true,
        alertRateMatchesCounts: true,
        criticalFlagMatchesTemplates: true,
      },
      templates: [
        expect.objectContaining({
          templateKey: 'atina-forge-sync-loop',
          alert: true,
        }),
      ],
    });
    expect(res.body.data.monitoring).toMatchObject({
      contractVersion: '2026-04-ops-v1',
      generatedAt: expect.any(String),
      checks: {
        workflowTemplateAlertConsistency: true,
      },
    });
  });
});
