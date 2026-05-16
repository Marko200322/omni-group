import { ValidationError } from '../../utils/errors';
import { WorkflowChainService } from '../../modules/workflow-chain/service/workflow-chain.service';
import * as db from '../../database/connection';

// eslint-disable-next-line no-var
var workflowRepo: {
  create: jest.Mock;
  get: jest.Mock;
  touchRun: jest.Mock;
};

jest.mock('../../modules/workflow-chain/repository/workflow-chain.repository', () => {
  workflowRepo = {
    create: jest.fn(),
    get: jest.fn(),
    touchRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    WorkflowChainRepository: jest.fn().mockImplementation(() => workflowRepo),
  };
});

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('WorkflowChain failure paths integration', () => {
  let service: WorkflowChainService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowChainService();
    workflowRepo.create.mockReset();
  });

  it('flags phase-locked modules during validation', async () => {
    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-phase-lock',
          name: 'Phase lock workflow',
          status: 'active',
          chain_definition: [
            { step: 'Run Forge', moduleSlug: 'forge', action: 'execute', config: {} },
          ],
        },
      ],
      rowCount: 1,
    });

    mockQuery.mockResolvedValueOnce({
      rows: [{ config: { current_phase: 'v2' } }],
      rowCount: 1,
    } as never);

    const result = await service.validate('user-1', 'wf-phase-lock');

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      {
        index: 0,
        step: 'Run Forge',
        reason: "Module 'forge' requires at least phase 'v3', current is 'v2'",
      },
    ]);
  });

  it('flags invalid config during validation', async () => {
    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-invalid-config',
          name: 'Invalid config workflow',
          status: 'active',
          chain_definition: [
            {
              step: 'Record invalid payment',
              moduleSlug: 'payments',
              action: 'record-manual',
              config: { amount: 0 },
            },
          ],
        },
      ],
      rowCount: 1,
    });

    mockQuery.mockResolvedValueOnce({
      rows: [{ config: { current_phase: 'v4' } }],
      rowCount: 1,
    } as never);

    const result = await service.validate('user-1', 'wf-invalid-config');

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([
      {
        index: 0,
        step: 'Record invalid payment',
        reason: 'payments.record-manual requires positive config.amount',
      },
    ]);
  });

  it('throws deterministic preflight error when force=false and preflight is invalid', async () => {
    jest.spyOn(service, 'validate').mockResolvedValue({
      workflowId: 'wf-preflight',
      workflowName: 'Preflight workflow',
      status: 'active',
      currentPhase: 'v4',
      totalSteps: 1,
      valid: false,
      issues: [{ index: 0, step: 'Bad Step', reason: 'bad config' }],
      warnings: [],
    });

    try {
      await service.run('user-1', 'wf-preflight', { trigger: 'manual' }, false);
      throw new Error('Expected preflight validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).message).toBe('Workflow chain preflight validation failed');
      expect((error as ValidationError).details).toEqual({
        workflowId: 'wf-preflight',
        issues: [{ index: 0, step: 'Bad Step', reason: 'bad config' }],
      });
    }
  });

  it('allows forced run with invalid preflight and logs workflow_force_run audit event', async () => {
    jest.spyOn(service, 'validate').mockResolvedValue({
      workflowId: 'wf-force',
      workflowName: 'Forced workflow',
      status: 'active',
      currentPhase: 'v4',
      totalSteps: 1,
      valid: false,
      issues: [{ index: 0, step: 'Record invalid payment', reason: 'bad config' }],
      warnings: [],
    });

    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-force',
          name: 'Forced workflow',
          status: 'active',
          chain_definition: [
            {
              step: 'Record invalid payment',
              moduleSlug: 'payments',
              action: 'record-manual',
              config: { amount: -1 },
            },
          ],
        },
      ],
      rowCount: 1,
    });

    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('RETURNING id') && sql.includes('workflow_chain_execution')) {
        return { rows: [{ id: 'exec-1' }], rowCount: 1 } as never;
      }
      return { rows: [], rowCount: 1 } as never;
    });

    const runResult = await service.run('user-1', 'wf-force', { trigger: 'manual' }, true);

    expect(runResult.executionTaskId).toBe('exec-1');
    expect(runResult.output.status).toBe('failed');
    expect(runResult.output.steps).toHaveLength(1);
    expect(runResult.output.steps[0]).toMatchObject({
      step: 'Record invalid payment',
      moduleSlug: 'payments',
      action: 'record-manual',
      status: 'failed',
      output: { error: 'payments record-manual requires positive config.amount' },
    });

    const forceRunCall = mockQuery.mock.calls.find(
      ([sql]) => typeof sql === 'string' && sql.includes("'workflow_force_run'")
    );
    expect(forceRunCall).toBeDefined();
    const payload = JSON.parse(((forceRunCall?.[1] as unknown[])?.[2] as string) ?? '{}') as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        workflowId: 'wf-force',
        reason: 'Forced run with invalid preflight',
        issues: [{ index: 0, step: 'Record invalid payment', reason: 'bad config' }],
      })
    );
    expect(typeof payload.timestamp).toBe('string');
  });

  it('fails template create-and-run when template contains phase-locked forge step', async () => {
    workflowRepo.create.mockResolvedValue({
      rows: [{ id: 'wf-template-lock', name: 'Template lock workflow', status: 'active' }],
      rowCount: 1,
    });
    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-template-lock',
          name: 'Template lock workflow',
          status: 'active',
          chain_definition: [{ step: 'Forge sync', moduleSlug: 'forge', action: 'connectivity-sync', config: {} }],
        },
      ],
      rowCount: 1,
    });
    mockQuery.mockResolvedValue({
      rows: [{ config: { current_phase: 'v1' } }],
      rowCount: 1,
    } as never);

    const executionPromise = service.createFromTemplateAndRun(
      'user-1',
      'atina-forge-sync-loop',
      'Locked template workflow',
      { source: 'test' }
    );

    await expect(executionPromise).rejects.toBeInstanceOf(ValidationError);
    await expect(executionPromise).rejects.toMatchObject({
      message: 'Workflow chain preflight validation failed',
      details: {
        workflowId: 'wf-template-lock',
        issues: expect.arrayContaining([
          expect.objectContaining({
            reason: expect.stringContaining("requires at least phase 'v3'"),
          }),
        ]),
      },
    });
  });

  it('retries failed step execution when retryAttempts is configured', async () => {
    jest.spyOn(service, 'validate').mockResolvedValue({
      workflowId: 'wf-retry',
      workflowName: 'Retry workflow',
      status: 'active',
      currentPhase: 'v4',
      totalSteps: 1,
      valid: true,
      issues: [],
      warnings: [],
    });

    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-retry',
          name: 'Retry workflow',
          status: 'active',
          chain_definition: [
            {
              step: 'Record payment with retry',
              moduleSlug: 'payments',
              action: 'record-manual',
              config: { amount: 99, currency: 'USD', retryAttempts: 2 },
            },
          ],
        },
      ],
      rowCount: 1,
    });

    let paymentInsertCount = 0;
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('RETURNING id') && sql.includes('workflow_chain_execution')) {
        return { rows: [{ id: 'exec-retry' }], rowCount: 1 } as never;
      }
      if (sql.includes('INSERT INTO payments')) {
        paymentInsertCount += 1;
        if (paymentInsertCount === 1) {
          throw new Error('Transient payment write failure');
        }
        return {
          rows: [{ id: 'pay-1', amount: 99, currency: 'USD', status: 'completed', provider: 'manual' }],
          rowCount: 1,
        } as never;
      }
      return { rows: [], rowCount: 1 } as never;
    });

    const runResult = await service.run('user-1', 'wf-retry', { trigger: 'manual' }, false);
    expect(paymentInsertCount).toBe(2);
    expect(runResult.status).toBe('completed');
    expect(runResult.output.status).toBe('ok');
    expect(runResult.output.steps[0]).toMatchObject({
      step: 'Record payment with retry',
      moduleSlug: 'payments',
      action: 'record-manual',
      status: 'ok',
      output: expect.objectContaining({
        retry: expect.objectContaining({
          attempts: 2,
          retries: 1,
        }),
      }),
    });
  });

  it('marks integration-hub.sync as failed when integration cannot be found', async () => {
    jest.spyOn(service, 'validate').mockResolvedValue({
      workflowId: 'wf-sync-missing',
      workflowName: 'Missing integration sync',
      status: 'active',
      currentPhase: 'v4',
      totalSteps: 1,
      valid: true,
      issues: [],
      warnings: [],
    });
    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-sync-missing',
          name: 'Missing integration sync',
          status: 'active',
          chain_definition: [{ step: 'Sync missing', moduleSlug: 'integration-hub', action: 'sync', config: { integrationId: 'missing' } }],
        },
      ],
      rowCount: 1,
    });
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('workflow_chain_execution') && sql.includes('RETURNING id')) {
        return { rows: [{ id: 'exec-sync-missing' }], rowCount: 1 } as never;
      }
      return { rows: [], rowCount: 1 } as never;
    });

    const result = await service.run('user-1', 'wf-sync-missing', {});

    expect(result.status).toBe('failed');
    expect(result.output.steps[0]).toMatchObject({
      moduleSlug: 'integration-hub',
      action: 'sync',
      status: 'failed',
      output: { error: 'Integration not found' },
    });
  });

  it('marks api-gateway.proxy as failed for missing route', async () => {
    jest.spyOn(service, 'validate').mockResolvedValue({
      workflowId: 'wf-proxy-missing',
      workflowName: 'Missing route proxy',
      status: 'active',
      currentPhase: 'v4',
      totalSteps: 1,
      valid: true,
      issues: [],
      warnings: [],
    });
    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-proxy-missing',
          name: 'Missing route proxy',
          status: 'active',
          chain_definition: [{ step: 'Proxy unknown', moduleSlug: 'api-gateway', action: 'proxy', config: { routeKey: 'route-missing' } }],
        },
      ],
      rowCount: 1,
    });
    mockQuery.mockImplementation(async (sql: string) => {
      if (sql.includes('workflow_chain_execution') && sql.includes('RETURNING id')) {
        return { rows: [{ id: 'exec-proxy-missing' }], rowCount: 1 } as never;
      }
      return { rows: [], rowCount: 1 } as never;
    });

    const result = await service.run('user-1', 'wf-proxy-missing', {});

    expect(result.status).toBe('failed');
    expect(result.output.steps[0]).toMatchObject({
      moduleSlug: 'api-gateway',
      action: 'proxy',
      status: 'failed',
      output: { error: 'Gateway route not found' },
    });
  });
});
