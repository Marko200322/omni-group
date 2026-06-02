import { query } from '../../../database/connection';

export class ScraperRepository {
  getUserPlanLimits(userId: string) {
    return query<{ limits: unknown }>(
      `SELECT p.limits FROM users u JOIN plans p ON u.plan_id = p.id WHERE u.id = $1`,
      [userId]
    );
  }

  createScrapeTask(userId: string, url: string, payload: Record<string, unknown>) {
    return query<{ id: string }>(
      `INSERT INTO tasks (user_id, type, name, status, payload)
       VALUES ($1, 'scrape_url', $2, 'running', $3)
       RETURNING id`,
      [userId, `Scrape: ${url}`, JSON.stringify(payload)]
    );
  }

  completeTask(taskId: string, result: Record<string, unknown>) {
    return query(
      `UPDATE tasks SET status = 'completed', result = $2, completed_at = NOW() WHERE id = $1`,
      [taskId, JSON.stringify(result)]
    );
  }

  failTask(taskId: string, message: string) {
    return query(`UPDATE tasks SET status = 'failed', error_message = $2 WHERE id = $1`, [
      taskId,
      message,
    ]);
  }

  createBulkTask(userId: string, urlCount: number, payload: Record<string, unknown>) {
    return query<{ id: string }>(
      `INSERT INTO tasks (user_id, type, name, status, payload)
       VALUES ($1, 'bulk_scrape', $2, 'queued', $3)
       RETURNING id`,
      [userId, `Bulk scrape: ${urlCount} URLs`, JSON.stringify(payload)]
    );
  }

  markTaskRunning(taskId: string) {
    return query(`UPDATE tasks SET status = 'running', started_at = NOW() WHERE id = $1`, [taskId]);
  }

  completeBulkTask(taskId: string, result: Record<string, unknown>) {
    return query(
      `UPDATE tasks SET status = 'completed', result = $2, completed_at = NOW() WHERE id = $1`,
      [taskId, JSON.stringify(result)]
    );
  }

  getJob(id: string, userId: string) {
    return query(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2 AND type IN ('scrape_url', 'bulk_scrape')`,
      [id, userId]
    );
  }

  listJobs(userId: string, limit: number, offset: number) {
    return query(
      `SELECT id, name, status, created_at, completed_at, (payload->>'url') AS url
       FROM tasks
       WHERE user_id = $1 AND type IN ('scrape_url', 'bulk_scrape')
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }
}
