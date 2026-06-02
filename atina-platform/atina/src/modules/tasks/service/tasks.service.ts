import { NotFoundError, PlanLimitError } from '../../../utils/errors';
import { addJob } from '../../../queue/queue';
import logger from '../../../utils/logger';
import type { TasksListQueryType } from '../dto/tasks.dto';

export type CreateTaskInput = {
  type: string;
  name: string;
  description?: string;
  priority?: number;
  payload?: Record<string, unknown>;
  scheduledAt?: string;
  maxAttempts?: number;
};
import { TasksRepository, type TaskRow } from '../repository/tasks.repository';

export type Task = TaskRow;

export class TasksService {
  private readonly repo = new TasksRepository();

  async createTask(userId: string, data: CreateTaskInput): Promise<Task> {
    const { rows: limitRows } = await this.repo.getUserPlanLimits(userId);
    const limits = (limitRows[0] as { limits?: { tasks_per_month?: number } })?.limits || {};
    if (limits.tasks_per_month !== -1) {
      const { rows: countRows } = await this.repo.countTasksThisMonth(userId);
      if (parseInt(countRows[0].count, 10) >= (limits.tasks_per_month || 0)) {
        throw new PlanLimitError('Monthly task limit reached. Please upgrade your plan.');
      }
    }

    const { rows } = await this.repo.insertTask(userId, {
      type: data.type,
      name: data.name,
      description: data.description ?? null,
      priority: data.priority ?? 5,
      payload: JSON.stringify(data.payload ?? {}),
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      maxAttempts: data.maxAttempts ?? 3,
    });

    const task = rows[0];
    if (!data.scheduledAt) {
      await this.queueTask(task);
    }
    return task;
  }

  private async queueTask(task: Task): Promise<void> {
    try {
      await addJob(
        'tasks',
        { taskId: task.id, type: task.type, payload: task.payload },
        { priority: 10 - task.priority, delay: 0 }
      );
      await this.repo.markQueued(task.id);
    } catch (err) {
      logger.error('Failed to queue task', { taskId: task.id, error: err });
    }
  }

  async listTasks(userId: string, params: TasksListQueryType) {
    const offset = (params.page - 1) * params.limit;
    const conditions = ['user_id = $1'];
    const values: unknown[] = [userId];
    let idx = 2;
    if (params.status) {
      conditions.push(`status = $${idx++}`);
      values.push(params.status);
    }
    if (params.type) {
      conditions.push(`type = $${idx++}`);
      values.push(params.type);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const [countResult, listResult] = await this.repo.listTasks(
      userId,
      where,
      values,
      params.limit,
      offset
    );
    return {
      tasks: listResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async getTask(taskId: string, userId: string): Promise<Task> {
    const { rows } = await this.repo.getTask(taskId, userId);
    if (!rows[0]) throw new NotFoundError('Task');
    return rows[0];
  }

  async cancelTask(taskId: string, userId: string): Promise<void> {
    const { rowCount } = await this.repo.cancelTask(taskId, userId);
    if (rowCount === 0) throw new NotFoundError('Task or task cannot be canceled');
  }

  async retryTask(taskId: string, userId: string): Promise<void> {
    const task = await this.getTask(taskId, userId);
    if (task.status !== 'failed') throw new NotFoundError('Failed task');
    await this.repo.resetForRetry(taskId);
    await this.queueTask({ ...task, status: 'pending', attempts: 0 });
  }

  async updateTaskStatus(
    taskId: string,
    status: string,
    result?: unknown,
    errorMessage?: string
  ): Promise<void> {
    const updates: string[] = ['status = $2', 'updated_at = NOW()'];
    const values: unknown[] = [taskId, status];
    let idx = 3;

    if (status === 'running') {
      updates.push(`started_at = NOW()`);
      updates.push(`attempts = attempts + 1`);
    }
    if (status === 'completed') {
      updates.push(`completed_at = NOW()`);
      if (result) {
        updates.push(`result = $${idx++}`);
        values.push(JSON.stringify(result));
      }
    }
    if (status === 'failed' && errorMessage) {
      updates.push(`error_message = $${idx++}`);
      values.push(errorMessage);
    }

    await this.repo.updateStatus(taskId, updates.join(', '), values);
  }

  async getAdminStats() {
    const [total, byStatus, byType] = await this.repo.adminStats();
    return {
      total: parseInt(total.rows[0].count, 10),
      byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, parseInt(r.count, 10)])),
      byType: byType.rows.map((r) => ({ type: r.type, count: parseInt(r.count, 10) })),
    };
  }
}
