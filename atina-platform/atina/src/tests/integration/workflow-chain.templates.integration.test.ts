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

const TEST_USER_ID = '11111111-1111-4111-8111-111111111111';
const TEST_USER_EMAIL = 'integration.workflow.chain@atina.test';

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
    [TEST_USER_ID, TEST_USER_EMAIL, 'integration-hash', 'Integration User', 'admin']
  );
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

async function seedEcosystemSystems(): Promise<void> {
  await query('DELETE FROM ecosystem_systems WHERE user_id = $1', [TEST_USER_ID]);
  await query(
    `INSERT INTO ecosystem_systems (user_id, system_slug, name, stage)
     VALUES
       ($1, 'atina-system', 'Atina System Test Node', 'v3'),
       ($1, 'forge', 'Forge Test Node', 'v3'),
       ($1, 'sistem-naplate', 'Sistem Naplate Test Node', 'v3')`,
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

describe('Workflow chain template execution integration', () => {
  let server: http.Server;

  beforeAll(async () => {
    const { app, workflowModule } = buildTestApp();
    await workflowModule.initialize();
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

  it('runs atina-forge-sync-loop template with atina-system and forge steps', async () => {
    await seedUser();
    await seedEcosystemSystems();
    await setCurrentPhase('v6');

    const res = await request(server)
      .post('/api/v1/workflow-chain/templates/atina-forge-sync-loop/create-and-run')
      .set('Authorization', `Bearer ${signAuthToken()}`)
      .send({
        name: 'Atina Forge Sync Integration',
        input: { source: 'integration-test' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.templateKey).toBe('atina-forge-sync-loop');

    const steps = res.body.data.execution.output.steps as Array<{
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
    expect(res.body.data.execution.output.status).toBe('ok');
  });

  it('returns a completed Atina+Forge execution task payload after template run', async () => {
    await seedUser();
    await seedEcosystemSystems();
    await setCurrentPhase('v6');

    const res = await request(server)
      .post('/api/v1/workflow-chain/templates/atina-forge-sync-loop/create-and-run')
      .set('Authorization', `Bearer ${signAuthToken()}`)
      .send({
        name: 'Atina+Forge Task Payload Integration',
        input: { source: 'integration-test-happy-path' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      templateKey: 'atina-forge-sync-loop',
      workflow: {
        name: 'Atina+Forge Task Payload Integration',
      },
      execution: {
        status: 'completed',
        output: {
          status: 'ok',
        },
      },
    });
    expect(res.body.data.execution.id).toEqual(expect.any(String));
    expect(res.body.data.executionTaskId).toEqual(expect.any(String));
    expect(res.body.data.execution.output.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ moduleSlug: 'atina-system', status: 'ok' }),
        expect.objectContaining({ moduleSlug: 'forge', status: 'ok' }),
      ])
    );
  });

  it('fails template execution preflight when current phase is below template minimum', async () => {
    await seedUser();
    await seedEcosystemSystems();
    await setCurrentPhase('v1');

    const res = await request(server)
      .post('/api/v1/workflow-chain/templates/atina-forge-sync-loop/create-and-run')
      .set('Authorization', `Bearer ${signAuthToken()}`)
      .send({
        name: 'Atina Forge Sync Should Fail Preflight',
        input: { source: 'integration-test' },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Workflow chain preflight validation failed');
    expect(res.body.error.details.workflowId).toBeDefined();
    expect(res.body.error.details.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: expect.stringContaining("requires at least phase 'v3'"),
        }),
      ])
    );
  });
});
