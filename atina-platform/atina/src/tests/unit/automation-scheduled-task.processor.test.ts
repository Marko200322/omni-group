import { AutomationScheduledTaskProcessor } from '../../modules/automation/service/automation-scheduled-task.processor';

describe('AutomationScheduledTaskProcessor', () => {
  const repo = {
    getQueuedScheduledTask: jest.fn(),
    getWorkflowTemplate: jest.fn(),
    completeExecution: jest.fn(),
    failExecution: jest.fn(),
  };
  const runner = { executeWorkflow: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    repo.completeExecution.mockResolvedValue({ rows: [], rowCount: 1 });
    repo.failExecution.mockResolvedValue({ rows: [], rowCount: 1 });
  });

  it('loads and completes a queued scheduled workflow', async () => {
    repo.getQueuedScheduledTask.mockResolvedValue({
      rows: [{
        id: 'task-1',
        user_id: 'user-1',
        payload: { workflowId: 'workflow-1', context: { leadId: 'lead-1' } },
      }],
    });
    repo.getWorkflowTemplate.mockResolvedValue({
      rows: [{ payload: { steps: [] } }],
    });
    runner.executeWorkflow.mockResolvedValue({ step: 'done' });
    const processor = new AutomationScheduledTaskProcessor(repo as never, runner as never);

    await expect(processor.process({ taskId: 'task-1' })).resolves.toEqual({ step: 'done' });
    expect(runner.executeWorkflow).toHaveBeenCalledWith(
      { steps: [] },
      expect.objectContaining({
        userId: 'user-1',
        scheduledTaskId: 'task-1',
        leadId: 'lead-1',
      }),
    );
    expect(repo.completeExecution).toHaveBeenCalledWith('task-1', { step: 'done' });
  });

  it('marks the task failed when its workflow cannot be loaded', async () => {
    repo.getQueuedScheduledTask.mockResolvedValue({
      rows: [{
        id: 'task-2',
        user_id: 'user-2',
        payload: { workflowId: 'missing-workflow' },
      }],
    });
    repo.getWorkflowTemplate.mockResolvedValue({ rows: [] });
    const processor = new AutomationScheduledTaskProcessor(repo as never, runner as never);

    await expect(processor.process({ taskId: 'task-2' })).rejects.toThrow(
      'Automation workflow not found',
    );
    expect(repo.failExecution).toHaveBeenCalledWith(
      'task-2',
      'Automation workflow not found: missing-workflow',
    );
  });
});
