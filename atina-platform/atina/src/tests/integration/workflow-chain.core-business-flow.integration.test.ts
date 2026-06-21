import http from 'http';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import 'express-async-errors';
import { WorkflowChainModule } from '../../modules/workflow-chain/workflow-chain.module';
import { closePool, query } from '../../database/connection';
import { config } from '../../config';
import { AppError } from '../../utils/errors';
import { sendError } from '../../utils/response';

const TEST_USER_ID = '33333333-3333-4333-8333-333333333333';
const TEST_USER_EMAIL = 'integration.workflow.core-flow@atina.test';

function signAuthToken(): string {
  return jwt.sign(
    {
      userId: TEST_USER_ID,
      email: TEST_USER_EMAIL,
      role: 'admin',
    },
    config.jwt.secret
  );
}

async function seedUser(): Promise<void> {
  await query('DELETE FROM users WHERE id = $1 OR email = $2', [TEST_USER_ID, TEST_USER_EMAIL]);
  await query(
    `INSERT INTO users (id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, $5)`,
    [TEST_USER_ID, TEST_USER_EMAIL, 'integration-hash', 'Core Flow Integration User', 'admin']
  );
}

async function resetUserData(): Promise<void> {
  await query('DELETE FROM workflow_chains WHERE user_id = $1', [TEST_USER_ID]);
  await query('DELETE FROM analytics_events WHERE user_id = $1', [TEST_USER_ID]);
  await query('DELETE FROM payments WHERE user_id = $1', [TEST_USER_ID]);
  await query('DELETE FROM contracts WHERE user_id = $1', [TEST_USER_ID]);
  await query('DELETE FROM crm_contacts WHERE user_id = $1', [TEST_USER_ID]);
  await query('DELETE FROM tasks WHERE user_id = $1', [TEST_USER_ID]);
  await query('DELETE FROM ecosystem_systems WHERE user_id = $1', [TEST_USER_ID]);
}

async function setCurrentPhase(phase: 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6'): Promise<void> {
  await query(
    `INSERT INTO modules (name, slug, description, is_core, is_active, config)
     VALUES ($1, $2, $3, true, true, $4)
     ON CONFLICT (slug)
     DO UPDATE SET config = EXCLUDED.config, is_active = true, updated_at = NOW()`,
    [
      'Phase Launch Control',
      'phase-launch-control',
      'Integration-test phase toggle',
      JSON.stringify({ current_phase: phase }),
    ]
  );
}

async function seedAtinaForgeSystems(): Promise<void> {
  await query(
    `INSERT INTO ecosystem_systems (user_id, system_slug, name, stage)
     VALUES
       ($1, 'atina-system', 'Atina System Core Flow Node', 'v6'),
       ($1, 'forge', 'Forge Core Flow Node', 'v6')
     ON CONFLICT DO NOTHING`,
    [TEST_USER_ID]
  );
}

function buildTestApp() {
  const app = express();
  app.use(express.json());

  const workflowModule = new WorkflowChainModule();
  app.use('/api/v1/workflow-chain', workflowModule.router);

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof AppError) {
      return sendError(res, err.message, err.statusCode, err.code, err.details);
    }
    return sendError(res, err.message || 'Error', 500);
  });

  return { app, workflowModule };
}

describe('Workflow chain core business flow integration', () => {
  let server: http.Server;

  beforeAll(async () => {
    const { app, workflowModule } = buildTestApp();
    await workflowModule.initialize();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  beforeEach(async () => {
    (config as { autonomy: { realEcosystemRuns: boolean } }).autonomy.realEcosystemRuns = false;
    await seedUser();
    await resetUserData();
    await setCurrentPhase('v6');
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
    await closePool();
  });

  it('executes lead -> CRM -> contract -> payment -> analytics flow with persisted artifacts', async () => {
    const createRes = await request(server)
      .post('/api/v1/workflow-chain')
      .set('Authorization', `Bearer ${signAuthToken()}`)
      .send({
        name: 'Core Business Flow - Lead To Analytics',
        steps: [
          {
            step: 'Create lead contact',
            moduleSlug: 'crm',
            action: 'create-contact',
            config: { firstName: 'Lead', source: 'integration-core-flow', status: 'lead' },
          },
          {
            step: 'Draft sales contract',
            moduleSlug: 'contracts',
            action: 'create',
            config: { title: 'Core Flow Contract', status: 'draft', value: 199, currency: 'USD' },
          },
          {
            step: 'Record payment',
            moduleSlug: 'payments',
            action: 'record-manual',
            config: { amount: 199, currency: 'USD', status: 'completed', provider: 'manual' },
          },
          {
            step: 'Track conversion analytics',
            moduleSlug: 'analytics',
            action: 'track',
            config: { eventName: 'core_business_flow_completed', properties: { source: 'integration' } },
          },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const workflowId = createRes.body.data.id as string;
    expect(workflowId).toEqual(expect.any(String));

    const runRes = await request(server)
      .post(`/api/v1/workflow-chain/${workflowId}/run`)
      .set('Authorization', `Bearer ${signAuthToken()}`)
      .send({ input: { origin: 'integration-test' } });

    expect(runRes.status).toBe(200);
    expect(runRes.body.success).toBe(true);
    expect(runRes.body.data.status).toBe('completed');
    expect(runRes.body.data.output.status).toBe('ok');
    expect(runRes.body.data.output.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moduleSlug: 'crm', status: 'ok' }),
        expect.objectContaining({ moduleSlug: 'contracts', status: 'ok' }),
        expect.objectContaining({ moduleSlug: 'payments', status: 'ok' }),
        expect.objectContaining({ moduleSlug: 'analytics', status: 'ok' }),
      ])
    );

    const [crmCount, contractCount, paymentCount, analyticsCount] = await Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM crm_contacts
         WHERE user_id = $1 AND source = 'integration-core-flow'`,
        [TEST_USER_ID]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM contracts
         WHERE user_id = $1 AND title = 'Core Flow Contract'`,
        [TEST_USER_ID]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM payments
         WHERE user_id = $1 AND amount = 199`,
        [TEST_USER_ID]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM analytics_events
         WHERE user_id = $1 AND event_name = 'core_business_flow_completed'`,
        [TEST_USER_ID]
      ),
    ]);

    expect(parseInt(crmCount.rows[0].count, 10)).toBe(1);
    expect(parseInt(contractCount.rows[0].count, 10)).toBe(1);
    expect(parseInt(paymentCount.rows[0].count, 10)).toBe(1);
    expect(parseInt(analyticsCount.rows[0].count, 10)).toBe(1);
  });

  it('executes Atina/Forge flow and writes ecosystem runs for both systems', async () => {
    await seedAtinaForgeSystems();

    const createRes = await request(server)
      .post('/api/v1/workflow-chain')
      .set('Authorization', `Bearer ${signAuthToken()}`)
      .send({
        name: 'Atina Forge Core Flow',
        steps: [
          {
            step: 'Atina sync prep',
            moduleSlug: 'atina-system',
            action: 'sync-prep',
            config: { revenueEstimate: 125 },
          },
          {
            step: 'Forge connectivity sync',
            moduleSlug: 'forge',
            action: 'connectivity-sync',
            config: { revenueEstimate: 185 },
          },
          {
            step: 'Track Atina Forge completion',
            moduleSlug: 'analytics',
            action: 'track',
            config: { eventName: 'atina_forge_core_flow_completed' },
          },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const workflowId = createRes.body.data.id as string;

    const runRes = await request(server)
      .post(`/api/v1/workflow-chain/${workflowId}/run`)
      .set('Authorization', `Bearer ${signAuthToken()}`)
      .send({ input: { source: 'integration-atina-forge' } });

    expect(runRes.status).toBe(200);
    expect(runRes.body.success).toBe(true);
    expect(runRes.body.data.status).toBe('completed');

    const steps = runRes.body.data.output.steps as Array<{
      moduleSlug: string;
      status: 'ok' | 'failed';
      output: { executed?: boolean; skipped?: boolean };
    }>;
    const atinaStep = steps.find((step) => step.moduleSlug === 'atina-system');
    const forgeStep = steps.find((step) => step.moduleSlug === 'forge');

    expect(atinaStep).toBeDefined();
    expect(forgeStep).toBeDefined();
    expect(atinaStep?.status).toBe('ok');
    expect(forgeStep?.status).toBe('ok');
    expect(atinaStep?.output.executed).toBe(true);
    expect(forgeStep?.output.executed).toBe(true);

    const [runCountsBySystem, analyticsCount] = await Promise.all([
      query<{ system_slug: string; count: string }>(
        `SELECT es.system_slug, COUNT(*) AS count
         FROM ecosystem_runs er
         JOIN ecosystem_systems es ON er.ecosystem_system_id = es.id
         WHERE es.user_id = $1
         GROUP BY es.system_slug`,
        [TEST_USER_ID]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM analytics_events
         WHERE user_id = $1 AND event_name = 'atina_forge_core_flow_completed'`,
        [TEST_USER_ID]
      ),
    ]);

    const counts = Object.fromEntries(runCountsBySystem.rows.map((row) => [row.system_slug, parseInt(row.count, 10)]));
    expect(counts['atina-system']).toBe(1);
    expect(counts.forge).toBe(1);
    expect(parseInt(analyticsCount.rows[0].count, 10)).toBe(1);
  });
});
