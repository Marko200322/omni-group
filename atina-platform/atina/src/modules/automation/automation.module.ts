import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { query } from '../../database/connection';
import { sendSuccess, sendCreated, paginate } from '../../utils/response';
import { validateBody, validateParams, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { StrictPaginationQueryDto } from '../../api/dto/pagination-query.dto';
import type { StrictPaginationQuery } from '../../api/dto/pagination-query.dto';
import { z } from 'zod';
import { NotFoundError } from '../../utils/errors';
import { addJob } from '../../queue/queue';
import logger from '../../utils/logger';

const WorkflowStepSchema = z
  .object({
    id: z.string(),
    type: z.enum(['send_email', 'wait', 'condition', 'http_request', 'create_task', 'notify']),
    config: z.record(z.unknown()),
    nextStepId: z.string().optional(),
    conditionTrue: z.string().optional(),
    conditionFalse: z.string().optional(),
  })
  .strict();

export type AutomationWorkflowStep = z.infer<typeof WorkflowStepSchema>;

/** Payload shape stored on `workflow_template` / used by `executeWorkflow`. */
export interface AutomationWorkflowPayload {
  steps?: AutomationWorkflowStep[];
  triggerType?: string;
  triggerConfig?: Record<string, unknown>;
  isActive?: boolean;
}

interface AutomationCondition {
  field?: string;
  operator?: string;
  value?: unknown;
}

/** Task / workflow-template / execution row ids in `tasks` are UUIDs. */
const AutomationTaskUuidParamsDto = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const CreateWorkflowDto = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    triggerType: z.enum(['manual', 'schedule', 'webhook', 'event']),
    triggerConfig: z.record(z.unknown()).default({}),
    steps: z.array(WorkflowStepSchema).min(1),
    isActive: z.boolean().default(true),
  })
  .strict();

const ExecuteWorkflowDto = z.preprocess(
  (v) => (v === undefined || v === null ? {} : v),
  z
    .object({
      context: z.record(z.unknown()).optional(),
    })
    .strict()
);

export class AutomationModule implements IModule {
  name = 'Automation';
  slug = 'automation';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
    this.startScheduledWorkflows();
  }

  private startScheduledWorkflows(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }
    // Check every minute for scheduled workflows
    this.schedulerInterval = setInterval(async () => {
      try {
        const { rows } = await query(
          `SELECT * FROM tasks
           WHERE type = 'automation_workflow'
             AND status = 'pending'
             AND scheduled_at <= NOW()`,
          []
        );

        for (const row of rows) {
          const payload = row.payload as { workflowId?: string } | null;
          await addJob('automation', { taskId: row.id, workflowId: payload?.workflowId }, {});
          await query(
            `UPDATE tasks SET status = 'queued', updated_at = NOW() WHERE id = $1`,
            [row.id]
          );
        }
      } catch (err) {
        logger.error('Automation scheduler error', { error: err });
      }
    }, 60000);
  }

  async shutdown(): Promise<void> {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  private async executeWorkflow(
    workflowData: AutomationWorkflowPayload,
    context: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const results: Record<string, unknown> = {};
    const steps = workflowData.steps ?? [];

    for (const step of steps) {
      try {
        const result = await this.executeStep(step, context);
        results[step.id] = result;
        Object.assign(context, { [`step_${step.id}`]: result });

        const waitDuration = step.type === 'wait' ? step.config.duration : undefined;
        if (typeof waitDuration === 'number' && waitDuration > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.min(waitDuration, 5000)));
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results[step.id] = { error: message };
        logger.warn(`Workflow step failed: ${step.id}`, { error: message });
      }
    }

    return results;
  }

  private async executeStep(step: AutomationWorkflowStep, context: Record<string, unknown>): Promise<unknown> {
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
        const { rows } = await query(
          `INSERT INTO tasks (user_id, type, name, payload, status)
           VALUES ($1, $2, $3, $4, 'pending')
           RETURNING id`,
          [
            context.userId,
            (step.config.taskType as string | undefined) || 'automation_task',
            (step.config.taskName as string | undefined) || 'Automated Task',
            JSON.stringify((step.config.payload as Record<string, unknown> | undefined) || {}),
          ]
        );
        return { taskId: rows[0].id };
      }

      case 'notify':
        await query(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES ($1, 'automation', $2, $3)`,
          [
            context.userId,
            (step.config.title as string | undefined) || 'Automation',
            (step.config.message as string | undefined) || 'Workflow step completed',
          ]
        );
        return { notified: true };

      case 'condition': {
        const conditionResult = this.evaluateCondition(
          step.config.condition as AutomationCondition | null | undefined,
          context
        );
        return { result: conditionResult };
      }

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

  private setupRoutes(): void {
    // List workflows (stored as task templates)
    this.router.get(
      '/workflows',
      authenticate,
      validateQuery(StrictPaginationQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { page, limit } = req.query as unknown as StrictPaginationQuery;
        const offset = (page - 1) * limit;

        const { rows: countRows } = await query<{ count: string }>(
          `SELECT COUNT(*) FROM tasks WHERE user_id = $1 AND type = 'workflow_template'`,
          [req.user!.userId]
        );
        const { rows } = await query(
          `SELECT * FROM tasks WHERE user_id = $1 AND type = 'workflow_template'
           ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [req.user!.userId, limit, offset]
        );

        paginate(res, rows, parseInt(countRows[0].count, 10), page, limit);
      }
    );

    // Create workflow
    this.router.post('/workflows', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(CreateWorkflowDto), async (req, res) => {
      const d = req.body;
      const { rows } = await query(
        `INSERT INTO tasks (user_id, type, name, description, status, payload)
         VALUES ($1, 'workflow_template', $2, $3, 'pending', $4)
         RETURNING *`,
        [
          req.user!.userId, d.name, d.description || null,
          JSON.stringify({
            triggerType: d.triggerType,
            triggerConfig: d.triggerConfig,
            steps: d.steps,
            isActive: d.isActive,
          }),
        ]
      );
      sendCreated(res, rows[0], 'Workflow created');
    });

    // Execute workflow manually
    this.router.post(
      '/workflows/:id/execute',
      authenticate,
      validateParams(AutomationTaskUuidParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(ExecuteWorkflowDto),
      async (req, res) => {
        const { rows } = await query(
          `SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND type = 'workflow_template'`,
          [req.params.id, req.user!.userId]
        );
        if (!rows[0]) throw new NotFoundError('Workflow');

        const workflowData = rows[0].payload as AutomationWorkflowPayload;
        const body = req.body as z.infer<typeof ExecuteWorkflowDto>;
        const context = { userId: req.user!.userId, ...(body.context ?? {}) };

        const { rows: execRows } = await query(
          `INSERT INTO tasks (user_id, type, name, status, payload, parent_task_id)
           VALUES ($1, 'workflow_execution', $2, 'running', $3, $4)
           RETURNING id`,
          [
            req.user!.userId,
            `Execution: ${rows[0].name}`,
            JSON.stringify({ workflowId: req.params.id, context }),
            req.params.id,
          ]
        );

        const executionId = execRows[0].id;

        this.executeWorkflow(workflowData, context)
          .then(async (results) => {
            await query(
              `UPDATE tasks SET status = 'completed', result = $2, completed_at = NOW()
               WHERE id = $1`,
              [executionId, JSON.stringify(results)]
            );
          })
          .catch(async (err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            await query(
              `UPDATE tasks SET status = 'failed', error_message = $2 WHERE id = $1`,
              [executionId, message]
            );
          });

        sendSuccess(res, { executionId, status: 'running' }, 'Workflow execution started');
      }
    );

    // Get execution status
    this.router.get(
      '/executions/:id',
      authenticate,
      validateParams(AutomationTaskUuidParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { rows } = await query(
          `SELECT * FROM tasks WHERE id = $1 AND user_id = $2`,
          [req.params.id, req.user!.userId]
        );
        if (!rows[0]) throw new NotFoundError('Execution');
        sendSuccess(res, rows[0]);
      }
    );

    // Delete workflow
    this.router.delete(
      '/workflows/:id',
      authenticate,
      validateParams(AutomationTaskUuidParamsDto),
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { rowCount } = await query(
          `DELETE FROM tasks WHERE id = $1 AND user_id = $2 AND type = 'workflow_template'`,
          [req.params.id, req.user!.userId]
        );
        if (rowCount === 0) throw new NotFoundError('Workflow');
        sendSuccess(res, null, 'Workflow deleted');
      }
    );

    // List recent executions
    this.router.get(
      '/executions',
      authenticate,
      validateQuery(StrictPaginationQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { page, limit } = req.query as unknown as StrictPaginationQuery;
        const offset = (page - 1) * limit;

        const { rows } = await query(
          `SELECT t.*, pt.name AS workflow_name
           FROM tasks t
           LEFT JOIN tasks pt ON t.parent_task_id = pt.id
           WHERE t.user_id = $1 AND t.type = 'workflow_execution'
           ORDER BY t.created_at DESC LIMIT $2 OFFSET $3`,
          [req.user!.userId, limit, offset]
        );
        sendSuccess(res, rows);
      }
    );
  }
}
