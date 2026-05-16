import { query } from '../../../database/connection';

export class TitanixRepository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = 'titanix'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  create(userId: string, name: string, budgetAllocated: number, executionProfile: string) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, budget_allocated, config, metrics)
       VALUES ($1, 'titanix', $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        name,
        budgetAllocated,
        JSON.stringify({ execution_profile: executionProfile }),
        JSON.stringify({ jobs_executed: 0, pipelines: 0, failures: 0 }),
      ]
    );
  }

  getOwned(id: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = 'titanix'`,
      [id, userId]
    );
  }

  insertRun(
    systemId: string,
    runType: string,
    outputPayload: Record<string, unknown>,
    status: 'completed' | 'failed' = 'completed'
  ) {
    return query(
      `INSERT INTO ecosystem_runs
       (ecosystem_system_id, run_type, status, output_payload, started_at, finished_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [systemId, runType, status, JSON.stringify(outputPayload)]
    );
  }

  insertTask(userId: string, name: string, payload: Record<string, unknown>) {
    return query(
      `INSERT INTO tasks (user_id, type, name, status, payload)
       VALUES ($1, 'titanix_pipeline', $2, 'queued', $3)
       RETURNING id`,
      [userId, name, JSON.stringify(payload)]
    );
  }

  updateAfterRun(systemId: string, revenueDelta: number, jobs: number, mode: string) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $2,
           efficiency_score = LEAST(100, efficiency_score + 2.7),
           metrics = metrics
             || jsonb_build_object('last_pipeline', $4::text, 'last_jobs', $3::int),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, revenueDelta, jobs, mode]
    );
  }
}
