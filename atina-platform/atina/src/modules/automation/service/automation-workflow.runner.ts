import axios from 'axios';
import { getCommsClient } from '../../../integrations';
import logger from '../../../utils/logger';
import { NotificationsService } from '../../notifications/service/notifications.service';
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
      case 'send_email': {
        const to = String(this.resolveConfigValue(step.config.to, context) ?? '').trim();
        const subject = String(this.resolveConfigValue(step.config.subject, context) ?? 'Automation').trim();
        const body = String(
          this.resolveConfigValue(step.config.body ?? step.config.html, context) ?? subject
        );
        if (!to) {
          return { sent: false, error: 'missing_to' };
        }
        const comms = getCommsClient();
        const notifications = new NotificationsService();
        if (!comms.isConfigured() && !notifications.isSmtpConfigured()) {
          return { sent: false, to, subject, reason: 'email_not_configured' };
        }
        await notifications.sendEmail(to, subject, body.includes('<') ? body : `<p>${body}</p>`, body);
        return { sent: true, to, subject, timestamp: new Date().toISOString() };
      }
      case 'http_request': {
        const url = String(this.resolveConfigValue(step.config.url, context) ?? '').trim();
        const method = String(step.config.method ?? 'GET').toUpperCase();
        if (!url) {
          return { executed: false, error: 'missing_url' };
        }
        const headers =
          step.config.headers && typeof step.config.headers === 'object'
            ? (step.config.headers as Record<string, string>)
            : undefined;
        const data = this.resolveConfigValue(step.config.body, context);
        const res = await axios.request({
          url,
          method: method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
          headers,
          data: method === 'GET' || method === 'HEAD' ? undefined : data,
          timeout: 30_000,
          validateStatus: () => true,
        });
        return {
          url,
          method,
          status: res.status,
          executed: true,
          data: typeof res.data === 'object' ? res.data : { body: res.data },
        };
      }
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

  private resolveConfigValue(value: unknown, context: Record<string, unknown>): unknown {
    if (typeof value !== 'string') return value;
    return value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(context[key] ?? ''));
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
