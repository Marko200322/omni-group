import http from 'http';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import 'express-async-errors';
import { WorkflowChainModule } from '../../modules/workflow-chain/workflow-chain.module';
import { query } from '../../database/connection';
import { config } from '../../config';
import { AppError } from '../../utils/errors';
import { sendError } from '../../utils/response';

const TEST_USER_ID = '55555555-5555-4555-8555-555555555555';
const TEST_USER_EMAIL = 'integration.workflow.extra-templates@atina.test';

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
    [TEST_USER_ID, TEST_USER_EMAIL, 'integration-hash', 'Extra Templates Integration User', 'admin']
  );
}

async function resetUserData(): Promise<void> {
  await query('DELETE FROM workflow_chains WHERE user_id = $1', [TEST_USER_ID]);
  await query('DELETE FROM analytics_events WHERE user_id = $1', [TEST_USER_ID]);
  await query('DELETE FROM crm_contacts WHERE user_id = $1', [TEST_USER_ID]);
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

describe('Workflow chain extra templates integration', () => {
  let server: http.Server;

  beforeAll(async () => {
    const { app, workflowModule } = buildTestApp();
    await workflowModule.initialize();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
  });

  beforeEach(async () => {
    await seedUser();
    await resetUserData();
    await setCurrentPhase('v6');
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('runs client-acquisition-pipeline template with hunter, scoring, CRM, and analytics steps', async () => {
    const res = await request(server)
      .post('/api/v1/workflow-chain/templates/client-acquisition-pipeline/create-and-run')
      .set('Authorization', `Bearer ${signAuthToken()}`)
      .send({
        name: 'Client Acquisition Pipeline Extra Template Integration',
        input: { origin: 'integration-extra-templates' },
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.templateKey).toBe('client-acquisition-pipeline');
    expect(res.body.data.execution.status).toBe('completed');
    expect(res.body.data.execution.output.status).toBe('ok');
    expect(res.body.data.execution.output.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moduleSlug: 'client-hunter', status: 'ok' }),
        expect.objectContaining({ moduleSlug: 'lead-scoring', status: 'ok' }),
        expect.objectContaining({ moduleSlug: 'crm', status: 'ok' }),
        expect.objectContaining({ moduleSlug: 'analytics', status: 'ok' }),
      ])
    );
  });
});
