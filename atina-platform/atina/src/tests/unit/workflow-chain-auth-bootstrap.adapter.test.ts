import { createWorkflowChainAuthBootstrapAdapter } from '../../modules/auth/service/workflow-chain-auth-bootstrap.adapter';

const bootstrapTemplates = jest.fn().mockResolvedValue({ created: 1, skipped: 0 });

jest.mock('../../modules/workflow-chain/service/workflow-chain.service', () => ({
  WorkflowChainService: jest.fn().mockImplementation(() => ({
    bootstrapTemplates,
  })),
}));

describe('workflow-chain-auth-bootstrap.adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createWorkflowChainAuthBootstrapAdapter delegates template bootstrap', async () => {
    const adapter = createWorkflowChainAuthBootstrapAdapter();
    const report = await adapter.bootstrapTemplates('user-1', true, 'Onboarding');
    expect(bootstrapTemplates).toHaveBeenCalledWith('user-1', true, 'Onboarding');
    expect(report).toEqual({ created: 1, skipped: 0 });
  });
});
