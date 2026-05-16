import { WorkflowChainService } from '../../modules/workflow-chain/service/workflow-chain.service';
import * as db from '../../database/connection';

// eslint-disable-next-line no-var
var workflowRepo: {
  get: jest.Mock;
};

jest.mock('../../modules/workflow-chain/repository/workflow-chain.repository', () => {
  workflowRepo = {
    get: jest.fn(),
  };
  return {
    WorkflowChainRepository: jest.fn().mockImplementation(() => workflowRepo),
  };
});

jest.mock('../../database/connection');
const mockQuery = db.query as jest.MockedFunction<typeof db.query>;

describe('WorkflowChain preflight Atina/Forge/Sistem-Naplate validation', () => {
  let service: WorkflowChainService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowChainService();
    mockQuery.mockResolvedValue({ rows: [{ config: { current_phase: 'v3' } }], rowCount: 1 } as never);
  });

  it('adds warnings for unknown ecosystem action and missing revenueEstimate', async () => {
    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-1',
          name: 'WF',
          status: 'active',
          chain_definition: [
            { step: 'Custom action', moduleSlug: 'atina-system', action: 'custom-action', config: {} },
          ],
        },
      ],
      rowCount: 1,
    });

    const result = await service.validate('u1', 'wf-1');
    const warningTexts = result.warnings.map((w) => String(w.warning ?? ''));

    expect(warningTexts).toEqual(
      expect.arrayContaining([
        expect.stringContaining('not in the recommended action catalog'),
        expect.stringContaining('missing config.revenueEstimate'),
      ])
    );
    expect(result.valid).toBe(true);
  });

  it('adds issue when revenueEstimate is non-positive or non-numeric', async () => {
    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-2',
          name: 'WF',
          status: 'active',
          chain_definition: [
            { step: 'Bad number', moduleSlug: 'forge', action: 'connectivity-sync', config: { revenueEstimate: 0 } },
            {
              step: 'Bad type',
              moduleSlug: 'sistem-naplate',
              action: 'billing-cycle',
              config: { revenueEstimate: '100' },
            },
          ],
        },
      ],
      rowCount: 1,
    });

    const result = await service.validate('u1', 'wf-2');

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: 'forge.connectivity-sync requires config.revenueEstimate to be a positive number',
        }),
        expect.objectContaining({
          reason: 'sistem-naplate.billing-cycle requires config.revenueEstimate to be a positive number',
        }),
      ])
    );
    expect(result.valid).toBe(false);
  });

  it('does not flag known action with valid revenueEstimate', async () => {
    workflowRepo.get.mockResolvedValue({
      rows: [
        {
          id: 'wf-3',
          name: 'WF',
          status: 'active',
          chain_definition: [
            { step: 'Good', moduleSlug: 'forge', action: 'offer-acceleration', config: { revenueEstimate: 123 } },
          ],
        },
      ],
      rowCount: 1,
    });

    const result = await service.validate('u1', 'wf-3');

    expect(result.issues).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('applies same warnings/issues for previewTemplate preflight', async () => {
    (service as unknown as {
      templates: Record<string, { name: string; description: string; minPhase: string; steps: Array<Record<string, unknown>> }>;
    }).templates['test-atina-preflight'] = {
      name: 'Test Atina Preflight',
      description: 'Template for preflight validation edge cases',
      minPhase: 'v3',
      steps: [
        { step: 'Unknown action', moduleSlug: 'atina-system', action: 'typo-action', config: {} },
        { step: 'Invalid revenue', moduleSlug: 'forge', action: 'ops-baseline', config: { revenueEstimate: -1 } },
      ],
    };

    const preview = await service.previewTemplate('test-atina-preflight');
    const warningTexts = preview.warnings.map((w) => String(w.warning ?? ''));
    const issueTexts = preview.issues.map((i) => String(i.reason ?? ''));

    expect(warningTexts).toEqual(
      expect.arrayContaining([
        expect.stringContaining('not in the recommended action catalog'),
        expect.stringContaining('missing config.revenueEstimate'),
      ])
    );
    expect(issueTexts).toEqual(
      expect.arrayContaining([
        'forge.ops-baseline requires config.revenueEstimate to be a positive number',
      ])
    );
    expect(preview.valid).toBe(false);
  });
});
