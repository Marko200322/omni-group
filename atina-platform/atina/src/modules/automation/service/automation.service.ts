import { NotFoundError } from '../../../utils/errors';
import { addJob } from '../../../queue/queue';
import logger from '../../../utils/logger';
import type { StrictPaginationQuery } from '../../../api/dto/pagination-query.dto';
import type {
  AutomationWorkflowPayload,
  CreateWorkflowDtoType,
  ExecuteWorkflowDtoType,
} from '../dto/automation.dto';
import { AutomationRepository } from '../repository/automation.repository';
import { AutomationWorkflowRunner } from './automation-workflow.runner';

export class AutomationService {
  private readonly repo = new AutomationRepository();
  readonly runner = new AutomationWorkflowRunner(this.repo);
  schedulerInterval: NodeJS.Timeout | null = null;

  startScheduledWorkflows(): void {
    if (this.schedulerInterval) clearInterval(this.schedulerInterval);
    this.schedulerInterval = setInterval(() => {
      void this.tickScheduler();
    }, 60000);
  }

  stopScheduledWorkflows(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  private async tickScheduler(): Promise<void> {
    try {
      const { rows } = await this.repo.listDueScheduledWorkflows();
      for (const row of rows) {
        const taskId = String((row as { id: string }).id);
        const payload = row.payload as { workflowId?: string } | null;
        await addJob('automation', { taskId, workflowId: payload?.workflowId }, {});
        await this.repo.queueScheduledTask(taskId);
      }
    } catch (err) {
      logger.error('Automation scheduler error', { error: err });
    }
  }

  async listWorkflows(userId: string, query: StrictPaginationQuery) {
    const offset = (query.page - 1) * query.limit;
    const [countResult, listResult] = await Promise.all([
      this.repo.countWorkflowTemplates(userId),
      this.repo.listWorkflowTemplates(userId, query.limit, offset),
    ]);
    return {
      rows: listResult.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
      page: query.page,
      limit: query.limit,
    };
  }

  async createWorkflow(userId: string, dto: CreateWorkflowDtoType) {
    const { rows } = await this.repo.createWorkflowTemplate(userId, dto.name, dto.description ?? null, {
      triggerType: dto.triggerType,
      triggerConfig: dto.triggerConfig,
      steps: dto.steps,
      isActive: dto.isActive,
    });
    return rows[0];
  }

  async executeWorkflow(workflowId: string, userId: string, dto: ExecuteWorkflowDtoType) {
    const { rows } = await this.repo.getWorkflowTemplate(workflowId, userId);
    if (!rows[0]) throw new NotFoundError('Workflow');
    const workflowData = rows[0].payload as AutomationWorkflowPayload;
    const context = { userId, ...(dto.context ?? {}) };
    const { rows: execRows } = await this.repo.createExecution(
      userId,
      `Execution: ${rows[0].name}`,
      workflowId,
      context
    );
    const executionId = execRows[0].id;
    void this.runner
      .executeWorkflow(workflowData, context)
      .then(async (results) => this.repo.completeExecution(executionId, results))
      .catch(async (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        await this.repo.failExecution(executionId, message);
      });
    return { executionId, status: 'running' as const };
  }

  async getExecution(id: string, userId: string) {
    const { rows } = await this.repo.getTask(id, userId);
    if (!rows[0]) throw new NotFoundError('Execution');
    return rows[0];
  }

  async deleteWorkflow(id: string, userId: string) {
    const { rowCount } = await this.repo.deleteWorkflowTemplate(id, userId);
    if (rowCount === 0) throw new NotFoundError('Workflow');
  }

  async listExecutions(userId: string, query: StrictPaginationQuery) {
    const offset = (query.page - 1) * query.limit;
    const { rows } = await this.repo.listExecutions(userId, query.limit, offset);
    return rows;
  }
}
