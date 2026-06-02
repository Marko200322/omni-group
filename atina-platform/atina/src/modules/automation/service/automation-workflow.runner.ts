import logger from '../../../utils/logger';
import type { AutomationWorkflowPayload, AutomationWorkflowStep } from '../dto/automation.dto';
import { AutomationRepository } from '../repository/automation.repository';

interface AutomationCondition {
  field?: string;
  operator?: string;
  value?: unknown;
}

export class AutomationWorkflowRunner {
  constructor(private readonly repo = new AutomationRepository()) {}

  async executeWorkflow(
    workflowData: AutomationWorkflowPayload,
    context: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    for (const step of workflowData.steps ?? []) {
      try {
        const result = await this.executeStep(step, context);
        results[step.id] = result;
        Object.assign(context, { [`step_${step.id}`]: result });
        const waitDuration = step.type === 'wait' ? step.config.duration : undefined;
        if (typeof waitDuration === 'number' && waitDuration > 0) {
          await new Promise((resolve) => setTimeout(resolve, Math.min(waitDuration, 5000)));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results[step.id] = { error: message };
        logger.warn(`Workflow step failed: ${step.id}`, { error: message });
      }
    }
    return results;
  }

  private async executeStep(
    step: AutomationWorkflowStep,
    context: Record<string, unknown>
  ): Promise<unknown> {
    switch (step.type) {
      case 'send_email':
        return {
          sent: true,
          to: step.config.to,
          subject: step.config.subject,
          timestamp: new Date(),
        };
      case 'http_request':
        return {
          url: step.config.url,
          method: step.config.method || 'GET',
          status: 200,
          executed: true,
        };
      case 'create_task': {
        const { rows } = await this.repo.insertAutomationTask(
          context.userId as string,
          (step.config.taskType as string | undefined) || 'automation_task',
          (step.config.taskName as string | undefined) || 'Automated Task',
          (step.config.payload as Record<string, unknown> | undefined) || {}
        );
        return { taskId: rows[0].id };
      }
      case 'notify':
        await this.repo.insertNotification(
          context.userId as string,
          (step.config.title as string | undefined) || 'Automation',
          (step.config.message as string | undefined) || 'Workflow step completed'
        );
        return { notified: true };
      case 'condition':
        return {
          result: this.evaluateCondition(
            step.config.condition as AutomationCondition | null | undefined,
            context
          ),
        };
      case 'wait':
        return { waited: true, duration: step.config.duration };
      default:
        return { executed: true, type: step.type };
    }
  }

  private evaluateCondition(
    condition: AutomationCondition | null | undefined,
    context: Record<string, unknown>
  ): boolean {
    if (!condition) return true;
    const { field, operator, value } = condition;
    if (!field || !operator) return true;
    const actual = context[field];
    switch (operator) {
      case 'eq':
        return actual === value;
      case 'ne':
        return actual !== value;
      case 'gt':
        return Number(actual) > Number(value);
      case 'lt':
        return Number(actual) < Number(value);
      case 'contains':
        return String(actual).includes(String(value));
      default:
        return true;
    }
  }
}
