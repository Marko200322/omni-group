import { query } from '../../../database/connection';

export class AutomationRepository {
  countWorkflowTemplates(userId: string) {
    return query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM tasks WHERE user_id = $1 AND type = 'workflow_template'`,
      [userId]
    );
  }

  listWorkflowTemplates(userId: string, limit: number, offset: number) {
    return query(
      `SELECT * FROM tasks WHERE user_id = $1 AND type = 'workflow_template'
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  createWorkflowTemplate(
    userId: string,
    name: string,
    description: string | null,
    payload: Record<string, unknown>
  ) {
    return query(
      `INSERT INTO tasks (user_id, type, name, description, status, payload)
       VALUES ($1, 'workflow_template', $2, $3, 'pending', $4)
       RETURNING *`,
      [userId, name, description, JSON.stringify(payload)]
    );
  }

  getWorkflowTemplate(id: string, userId: string) {
    return query(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND type = 'workflow_template'`,
      [id, userId]
    );
  }

  createExecution(
    userId: string,
    name: string,
    workflowId: string,
    context: Record<string, unknown>
  ) {
    return query<{ id: string }>(
      `INSERT INTO tasks (user_id, type, name, status, payload, parent_task_id)
       VALUES ($1, 'workflow_execution', $2, 'running', $3, $4)
       RETURNING id`,
      [userId, name, JSON.stringify({ workflowId, context }), workflowId]
    );
  }

  completeExecution(id: string, result: Record<string, unknown>) {
    return query(
      `UPDATE tasks SET status = 'completed', result = $2, completed_at = NOW() WHERE id = $1`,
      [id, JSON.stringify(result)]
    );
  }

  failExecution(id: string, message: string) {
    return query(`UPDATE tasks SET status = 'failed', error_message = $2 WHERE id = $1`, [
      id,
      message,
    ]);
  }

  getTask(id: string, userId: string) {
    return query(`SELECT * FROM tasks WHERE id = $1 AND user_id = $2`, [id, userId]);
  }

  deleteWorkflowTemplate(id: string, userId: string) {
    return query(`DELETE FROM tasks WHERE id = $1 AND user_id = $2 AND type = 'workflow_template'`, [
      id,
      userId,
    ]);
  }

  listExecutions(userId: string, limit: number, offset: number) {
    return query(
      `SELECT t.*, pt.name AS workflow_name
       FROM tasks t
       LEFT JOIN tasks pt ON t.parent_task_id = pt.id
       WHERE t.user_id = $1 AND t.type = 'workflow_execution'
       ORDER BY t.created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  listDueScheduledWorkflows() {
    return query(
      `SELECT * FROM tasks
       WHERE type = 'automation_workflow'
         AND status = 'pending'
         AND scheduled_at <= NOW()`
    );
  }

  queueScheduledTask(taskId: string) {
    return query(`UPDATE tasks SET status = 'queued', updated_at = NOW() WHERE id = $1`, [taskId]);
  }

  insertAutomationTask(
    userId: string,
    taskType: string,
    taskName: string,
    payload: Record<string, unknown>
  ) {
    return query<{ id: string }>(
      `INSERT INTO tasks (user_id, type, name, payload, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id`,
      [userId, taskType, taskName, JSON.stringify(payload)]
    );
  }

  insertNotification(userId: string, title: string, message: string) {
    return query(
      `INSERT INTO notifications (user_id, type, title, message)
       VALUES ($1, 'automation', $2, $3)`,
      [userId, title, message]
    );
  }
}
