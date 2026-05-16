import { WorkflowChainService } from '../../modules/workflow-chain/service/workflow-chain.service';
import * as db from '../../database/connection';

// eslint-disable-next-line no-var
var workflowRepo: {
  get: jest.Mock;
  touchRun: jest.Mock;
};

jest.mock('../../modules/workflow-chain/repository/workflow-chain.repository', () => {
  workflowRepo = {
    get: jest.fn(),
    touchRun: jest.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  };
  return {
    WorkflowChainRepository: jest.fn().mockImplementation(() => workflowRepo),
  };
});

jest.mock('../../database/connection');

const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('WorkflowChainService audit payload normalization', () => {
  let service: WorkflowChainService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowChainService();

    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-1',
          name: 'Workflow One',
          status: 'active',
          chain_definition: [{ step: 'Step One', moduleSlug: 'unknown-module', action: 'noop', config: {} }],
        },
      ],
      rowCount: 1,
    });

    mockQuery.mockImplementation(async (sql: string, _params?: unknown[]) => {
      if (sql.includes('INSERT INTO tasks') && sql.includes('workflow_chain_execution')) {
        return { rows: [{ id: 'exec-1' }], rowCount: 1 } as never;
      }
      return { rows: [], rowCount: 1 } as never;
    });
  });

  it('writes normalized payloads for force run and step executed audit events', async () => {
    jest.spyOn(service, 'validate').mockResolvedValue({
      workflowId: 'wf-1',
      workflowName: 'Workflow One',
      status: 'active',
      currentPhase: 'v1',
      totalSteps: 1,
      valid: false,
      issues: [{ index: 0, step: 'Step One', issue: 'sample issue' }],
      warnings: [],
    });

    await service.run('user-1', 'wf-1', { trigger: 'manual' }, true);

    const forceRunCall = mockQuery.mock.calls.find((c) => (c[0] as string).includes("'workflow_force_run'"));
    const stepExecutedCall = mockQuery.mock.calls.find((c) => (c[0] as string).includes("'workflow_step_executed'"));

    expect(forceRunCall).toBeDefined();
    expect(stepExecutedCall).toBeDefined();

    const forcePayload = JSON.parse(((forceRunCall?.[1] as unknown[])?.[2] as string) ?? '{}') as Record<string, unknown>;
    const stepPayload = JSON.parse(((stepExecutedCall?.[1] as unknown[])?.[3] as string) ?? '{}') as Record<string, unknown>;

    expect(forcePayload).toEqual(
      expect.objectContaining({
        workflowId: 'wf-1',
        reason: 'Forced run with invalid preflight',
      })
    );
    expect(typeof forcePayload.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(String(forcePayload.timestamp)))).toBe(false);
    expect(forcePayload).not.toHaveProperty('workflow_id');
    expect(forcePayload).not.toHaveProperty('chainId');

    expect(stepPayload).toEqual(
      expect.objectContaining({
        workflowId: 'wf-1',
        step: 'Step One',
        moduleSlug: 'unknown-module',
        action: 'noop',
      })
    );
    expect(typeof stepPayload.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(String(stepPayload.timestamp)))).toBe(false);
    expect(stepPayload).not.toHaveProperty('workflow_id');
    expect(stepPayload).not.toHaveProperty('chainId');
  });

  it('persists normalized execution payload contract with id/template/status/output/steps', async () => {
    jest.spyOn(service, 'validate').mockResolvedValue({
      workflowId: 'wf-1',
      workflowName: 'Workflow One',
      status: 'active',
      currentPhase: 'v1',
      totalSteps: 1,
      valid: true,
      issues: [],
      warnings: [],
    });

    await service.run('user-1', 'wf-1', { trigger: 'manual' }, false, 'atina-forge-sync-loop');

    const updateCall = mockQuery.mock.calls.find(
      (c) => (c[0] as string).includes('UPDATE tasks') && (c[0] as string).includes('payload = $4')
    );
    expect(updateCall).toBeDefined();
    const payload = JSON.parse(((updateCall?.[1] as unknown[])?.[3] as string) ?? '{}') as Record<string, unknown>;
    expect(payload).toEqual(
      expect.objectContaining({
        workflowId: 'wf-1',
        id: 'exec-1',
        status: 'completed',
        templateKey: 'atina-forge-sync-loop',
        template: { key: 'atina-forge-sync-loop' },
      })
    );
    expect(Array.isArray(payload.steps)).toBe(true);
    expect(payload.output).toEqual(
      expect.objectContaining({
        status: 'ok',
        steps: expect.any(Array),
      })
    );
  });
});
