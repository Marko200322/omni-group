import { query } from '../../../database/connection';

export class WorkflowChainRepository {
  create(userId: string, name: string, chainDefinition: unknown[]) {
    return query(
      `INSERT INTO workflow_chains (user_id, name, chain_definition)
       VALUES ($1,$2,$3)
       RETURNING *`,
      [userId, name, JSON.stringify(chainDefinition)]
    );
  }

  list(userId: string) {
    return query(
      `SELECT * FROM workflow_chains
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  get(userId: string, id: string) {
    return query(
      `SELECT * FROM workflow_chains
       WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
  }

  update(userId: string, id: string, name?: string, steps?: unknown[]) {
    return query(
      `UPDATE workflow_chains
       SET name = COALESCE($3, name),
           chain_definition = COALESCE($4, chain_definition),
           updated_at = NOW()
       WHERE user_id = $1 AND id = $2
       RETURNING *`,
      [userId, id, name ?? null, steps ? JSON.stringify(steps) : null]
    );
  }

  delete(userId: string, id: string) {
    return query(
      `DELETE FROM workflow_chains
       WHERE user_id = $1 AND id = $2`,
      [userId, id]
    );
  }

  setStatus(userId: string, id: string, status: 'active' | 'paused') {
    return query(
      `UPDATE workflow_chains
       SET status = $3,
           updated_at = NOW()
       WHERE user_id = $1 AND id = $2
       RETURNING *`,
      [userId, id, status]
    );
  }

  touchRun(id: string) {
    return query(
      `UPDATE workflow_chains
       SET last_run_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  listExecutions(userId: string, limit: number, offset: number, workflowId?: string) {
    if (workflowId) {
      return query(
        `SELECT id, type, name, status, payload, result, error_message, started_at, completed_at, created_at, updated_at
         FROM tasks
         WHERE user_id = $1
           AND type = 'workflow_chain_execution'
           AND payload->>'workflowId' = $2
         ORDER BY created_at DESC
         LIMIT $3 OFFSET $4`,
        [userId, workflowId, limit, offset]
      );
    }
    return query(
      `SELECT id, type, name, status, payload, result, error_message, started_at, completed_at, created_at, updated_at
       FROM tasks
       WHERE user_id = $1
         AND type = 'workflow_chain_execution'
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }

  countExecutions(userId: string, workflowId?: string) {
    if (workflowId) {
      return query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM tasks
         WHERE user_id = $1
           AND type = 'workflow_chain_execution'
           AND payload->>'workflowId' = $2`,
        [userId, workflowId]
      );
    }
    return query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM tasks
       WHERE user_id = $1
         AND type = 'workflow_chain_execution'`,
      [userId]
    );
  }

  getExecution(userId: string, executionTaskId: string) {
    return query(
      `SELECT id, type, name, status, payload, result, error_message, started_at, completed_at, created_at, updated_at
       FROM tasks
       WHERE id = $1
         AND user_id = $2
         AND type = 'workflow_chain_execution'
       LIMIT 1`,
      [executionTaskId, userId]
    );
  }

  executionStats(userId: string, workflowId?: string) {
    if (workflowId) {
      return query<{
        total: string;
        completed: string;
        failed: string;
        running: string;
        avg_duration_ms: string | null;
      }>(
        `SELECT
           COUNT(*) AS total,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
           SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
           SUM(CASE WHEN status IN ('running','queued','pending','retrying') THEN 1 ELSE 0 END) AS running,
           AVG(
             CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
               THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
               ELSE NULL
             END
           ) AS avg_duration_ms
         FROM tasks
         WHERE user_id = $1
           AND type = 'workflow_chain_execution'
           AND payload->>'workflowId' = $2`,
        [userId, workflowId]
      );
    }
    return query<{
      total: string;
      completed: string;
      failed: string;
      running: string;
      avg_duration_ms: string | null;
    }>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed,
         SUM(CASE WHEN status IN ('running','queued','pending','retrying') THEN 1 ELSE 0 END) AS running,
         AVG(
           CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL
             THEN EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000
             ELSE NULL
           END
         ) AS avg_duration_ms
       FROM tasks
       WHERE user_id = $1
         AND type = 'workflow_chain_execution'`,
      [userId]
    );
  }

  stepAnalytics(userId: string, days: number, workflowId?: string) {
    if (workflowId) {
      return query<{
        module_slug: string;
        action: string;
        ok_count: string;
        failed_count: string;
        total_count: string;
      }>(
        `SELECT
           COALESCE(step->>'moduleSlug', 'unknown') AS module_slug,
           COALESCE(step->>'action', 'unknown') AS action,
           SUM(CASE WHEN step->>'status' = 'ok' THEN 1 ELSE 0 END) AS ok_count,
           SUM(CASE WHEN step->>'status' = 'failed' THEN 1 ELSE 0 END) AS failed_count,
           COUNT(*) AS total_count
         FROM tasks t
         CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.result->'steps', '[]'::jsonb)) AS step
         WHERE t.user_id = $1
           AND t.type = 'workflow_chain_execution'
           AND t.created_at >= NOW() - ($2::text || ' days')::interval
           AND t.payload->>'workflowId' = $3
         GROUP BY module_slug, action
         ORDER BY total_count DESC`,
        [userId, days, workflowId]
      );
    }
    return query<{
      module_slug: string;
      action: string;
      ok_count: string;
      failed_count: string;
      total_count: string;
    }>(
      `SELECT
         COALESCE(step->>'moduleSlug', 'unknown') AS module_slug,
         COALESCE(step->>'action', 'unknown') AS action,
         SUM(CASE WHEN step->>'status' = 'ok' THEN 1 ELSE 0 END) AS ok_count,
         SUM(CASE WHEN step->>'status' = 'failed' THEN 1 ELSE 0 END) AS failed_count,
         COUNT(*) AS total_count
       FROM tasks t
       CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.result->'steps', '[]'::jsonb)) AS step
       WHERE t.user_id = $1
         AND t.type = 'workflow_chain_execution'
         AND t.created_at >= NOW() - ($2::text || ' days')::interval
       GROUP BY module_slug, action
       ORDER BY total_count DESC`,
      [userId, days]
    );
  }
}
