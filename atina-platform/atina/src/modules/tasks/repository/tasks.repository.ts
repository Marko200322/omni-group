import { query } from '../../../database/connection';

export type TaskRow = {
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
};

export class TasksRepository {
  getUserPlanLimits(userId: string) {
    return query<{ limits?: { tasks_per_month?: number } }>(
      `SELECT p.limits FROM users u JOIN plans p ON u.plan_id = p.id WHERE u.id = $1`,
      [userId]
    );
  }

  countTasksThisMonth(userId: string) {
    return query<{ count: string }>(
      `SELECT COUNT(*) FROM tasks
       WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())`,
      [userId]
    );
  }

  insertTask(
    userId: string,
    data: {
      type: string;
      name: string;
      description: string | null;
      priority: number;
      payload: string;
      scheduledAt: Date | null;
      maxAttempts: number;
    }
  ) {
    return query<TaskRow>(
      `INSERT INTO tasks (user_id, type, name, description, priority, payload, scheduled_at, max_attempts)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        data.type,
        data.name,
        data.description,
        data.priority,
        data.payload,
        data.scheduledAt,
        data.maxAttempts,
      ]
    );
  }

  markQueued(taskId: string) {
    return query(`UPDATE tasks SET status = 'queued', updated_at = NOW() WHERE id = $1`, [taskId]);
  }

  listTasks(userId: string, whereSql: string, values: unknown[], limit: number, offset: number) {
    return Promise.all([
      query<{ count: string }>(`SELECT COUNT(*) FROM tasks ${whereSql}`, values),
      query<TaskRow>(
        `SELECT * FROM tasks ${whereSql}
         ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset]
      ),
    ]);
  }

  getTask(taskId: string, userId: string) {
    return query<TaskRow>('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [taskId, userId]);
  }

  cancelTask(taskId: string, userId: string) {
    return query(
      `UPDATE tasks SET status = 'canceled', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status IN ('pending', 'queued')`,
      [taskId, userId]
    );
  }

  resetForRetry(taskId: string) {
    return query(
      `UPDATE tasks SET status = 'pending', attempts = 0, error_message = NULL, updated_at = NOW()
       WHERE id = $1`,
      [taskId]
    );
  }

  updateStatus(taskId: string, setClause: string, values: unknown[]) {
    return query(`UPDATE tasks SET ${setClause} WHERE id = $1`, values);
  }

  adminStats() {
    return Promise.all([
      query<{ count: string }>('SELECT COUNT(*) FROM tasks', []),
      query<{ status: string; count: string }>(
        'SELECT status, COUNT(*) FROM tasks GROUP BY status',
        []
      ),
      query<{ type: string; count: string }>(
        'SELECT type, COUNT(*) FROM tasks GROUP BY type ORDER BY count DESC LIMIT 10',
        []
      ),
    ]);
  }
}
