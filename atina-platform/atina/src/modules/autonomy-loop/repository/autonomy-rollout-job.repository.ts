import { query } from '../../../database/connection';
import type { CategoryRolloutDtoType } from '../dto/autonomy-loop.dto';
import type { RolloutJobStatus } from '../service/category-rollout-job.service';

export type RolloutJobRow = {
  id: string;
  user_id: string | null;
  status: RolloutJobStatus;
  request: CategoryRolloutDtoType;
  result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: Date;
  finished_at: Date | null;
};

export class AutonomyRolloutJobRepository {
  async insert(input: {
    id: string;
    userId: string | null;
    request: CategoryRolloutDtoType;
  }): Promise<RolloutJobRow> {
    const { rows } = await query<RolloutJobRow>(
      `INSERT INTO autonomy_rollout_jobs (id, user_id, status, request)
       VALUES ($1, $2, 'running', $3::jsonb)
       RETURNING id, user_id, status, request, result, error_message, started_at, finished_at`,
      [input.id, input.userId, JSON.stringify(input.request)],
    );
    return rows[0];
  }

  async markCompleted(id: string, result: Record<string, unknown>): Promise<void> {
    await query(
      `UPDATE autonomy_rollout_jobs
       SET status = 'completed', result = $2::jsonb, finished_at = NOW()
       WHERE id = $1`,
      [id, JSON.stringify(result)],
    );
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await query(
      `UPDATE autonomy_rollout_jobs
       SET status = 'failed', error_message = $2, finished_at = NOW()
       WHERE id = $1`,
      [id, errorMessage],
    );
  }

  async getActive(): Promise<RolloutJobRow | null> {
    const { rows } = await query<RolloutJobRow>(
      `SELECT id, user_id, status, request, result, error_message, started_at, finished_at
       FROM autonomy_rollout_jobs
       WHERE status = 'running'
       ORDER BY started_at DESC
       LIMIT 1`,
    );
    return rows[0] ?? null;
  }

  async getLatest(): Promise<RolloutJobRow | null> {
    const { rows } = await query<RolloutJobRow>(
      `SELECT id, user_id, status, request, result, error_message, started_at, finished_at
       FROM autonomy_rollout_jobs
       ORDER BY started_at DESC
       LIMIT 1`,
    );
    return rows[0] ?? null;
  }
}
