import type { AutomationWorkflowPayload } from '../dto/automation.dto';
import { AutomationRepository } from '../repository/automation.repository';
import { AutomationWorkflowRunner } from './automation-workflow.runner';

function asObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return typeof value === 'object' ? value as Record<string, unknown> : {};
}

export class AutomationScheduledTaskProcessor {
  constructor(
    private readonly repo = new AutomationRepository(),
    private readonly runner = new AutomationWorkflowRunner(repo),
  ) {}

  async process(input: { taskId?: unknown; workflowId?: unknown }): Promise<Record<string, unknown>> {
    const taskId = String(input.taskId ?? '').trim();
    if (!taskId) throw new Error('Automation queue job is missing taskId');

    const { rows: taskRows } = await this.repo.getQueuedScheduledTask(taskId);
    const task = taskRows[0];
    if (!task) throw new Error(`Queued automation task not found: ${taskId}`);

    try {
      const taskPayload = asObject(task.payload);
      const workflowId = String(input.workflowId ?? taskPayload.workflowId ?? '').trim();
      if (!workflowId) throw new Error(`Automation task ${taskId} is missing workflowId`);

      const { rows: workflowRows } = await this.repo.getWorkflowTemplate(workflowId, task.user_id);
      const workflow = workflowRows[0] as { payload?: unknown } | undefined;
      if (!workflow) throw new Error(`Automation workflow not found: ${workflowId}`);

      const context = {
        ...asObject(taskPayload.context),
        userId: task.user_id,
        scheduledTaskId: taskId,
      };
      const result = await this.runner.executeWorkflow(
        asObject(workflow.payload) as unknown as AutomationWorkflowPayload,
        context,
      );
      await this.repo.completeExecution(taskId, result);
      return result;
    } catch (error) {
      await this.repo.failExecution(
        taskId,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
