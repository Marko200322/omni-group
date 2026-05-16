import { query } from '../../../database/connection';
import { NotFoundError, PlanLimitError } from '../../../utils/errors';
import { addJob } from '../../../queue/queue';
import logger from '../../../utils/logger';

export interface Task {
  id: string;
  user_id: string;
  type: string;
  name: string;
  description: string | null;
  status: string;
  priority: number;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error_message: string | null;
  attempts: number;
  max_attempts: number;
  scheduled_at: Date | null;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

export class TasksService {
  async createTask(userId: string, data: {
    type: string;
    name: string;
    description?: string;
    priority?: number;
    payload?: Record<string, unknown>;
    scheduledAt?: string;
    maxAttempts?: number;
  }): Promise<Task> {
    // Check plan limits
    const { rows: limitRows } = await query(
      `SELECT p.limits FROM users u JOIN plans p ON u.plan_id = p.id WHERE u.id = $1`,
      [userId]
    );

    const limits = (limitRows[0] as any)?.limits || {};
    if (limits.tasks_per_month !== -1) {
      const { rows: countRows } = await query<{ count: string }>(
        `SELECT COUNT(*) FROM tasks
         WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())`,
        [userId]
      );
      if (parseInt(countRows[0].count, 10) >= (limits.tasks_per_month || 0)) {
        throw new PlanLimitError('Monthly task limit reached. Please upgrade your plan.');
      }
    }

    const { rows } = await query<Task>(
      `INSERT INTO tasks (user_id, type, name, description, priority, payload, scheduled_at, max_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId, data.type, data.name, data.description || null,
        data.priority || 5, JSON.stringify(data.payload || {}),
        data.scheduledAt ? new Date(data.scheduledAt) : null,
        data.maxAttempts || 3,
      ]
    );

    const task = rows[0];

    // Queue for execution if not scheduled
    if (!data.scheduledAt) {
      await this.queueTask(task);
    }

    return task;
  }

  private async queueTask(task: Task): Promise<void> {
    try {
      await addJob('tasks', { taskId: task.id, type: task.type, payload: task.payload }, {
        priority: 10 - task.priority, // Bull uses lower = higher priority
        delay: 0,
      });

      await query(
        `UPDATE tasks SET status = 'queued', updated_at = NOW() WHERE id = $1`,
        [task.id]
      );
    } catch (err) {
      logger.error('Failed to queue task', { taskId: task.id, error: err });
    }
  }

  async listTasks(userId: string, params: {
    page: number;
    limit: number;
    status?: string;
    type?: string;
  }) {
    const offset = (params.page - 1) * params.limit;
    const conditions = ['user_id = $1'];
    const values: unknown[] = [userId];
    let idx = 2;

    if (params.status) { conditions.push(`status = $${idx++}`); values.push(params.status); }
    if (params.type) { conditions.push(`type = $${idx++}`); values.push(params.type); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*) FROM tasks ${where}`, values
    );

    const { rows } = await query<Task>(
      `SELECT * FROM tasks ${where}
       ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, params.limit, offset]
    );

    return { tasks: rows, total: parseInt(countRows[0].count, 10) };
  }

  async getTask(taskId: string, userId: string): Promise<Task> {
    const { rows } = await query<Task>(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskId, userId]
    );
    if (!rows[0]) throw new NotFoundError('Task');
    return rows[0];
  }

  async cancelTask(taskId: string, userId: string): Promise<void> {
    const { rowCount } = await query(
      `UPDATE tasks SET status = 'canceled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'queued')`,
      [taskId, userId]
    );
    if (rowCount === 0) throw new NotFoundError('Task or task cannot be canceled');
  }

  async retryTask(taskId: string, userId: string): Promise<void> {
    const task = await this.getTask(taskId, userId);
    if (task.status !== 'failed') throw new NotFoundError('Failed task');

    await query(
      `UPDATE tasks SET status = 'pending', attempts = 0, error_message = NULL, updated_at = NOW()
       WHERE id = $1`,
      [taskId]
    );

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
      if (result) { updates.push(`result = $${idx++}`); values.push(JSON.stringify(result)); }
    }
    if (status === 'failed' && errorMessage) {
      updates.push(`error_message = $${idx++}`);
      values.push(errorMessage);
    }

    await query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = $1`, values);
  }

  async getAdminStats() {
    const [total, byStatus, byType] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) FROM tasks', []),
      query<{ status: string; count: string }>(
        'SELECT status, COUNT(*) FROM tasks GROUP BY status', []
      ),
      query<{ type: string; count: string }>(
        'SELECT type, COUNT(*) FROM tasks GROUP BY type ORDER BY count DESC LIMIT 10', []
      ),
    ]);

    return {
      total: parseInt(total.rows[0].count, 10),
      byStatus: Object.fromEntries(byStatus.rows.map(r => [r.status, parseInt(r.count, 10)])),
      byType: byType.rows.map(r => ({ type: r.type, count: parseInt(r.count, 10) })),
    };
  }
}
