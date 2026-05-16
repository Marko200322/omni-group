import { query } from '../../../database/connection';

export class TitanScoreRepository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = 'titan-score'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  create(userId: string, name: string, budgetAllocated: number, weightProfile: string) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, budget_allocated, config, metrics)
       VALUES ($1, 'titan-score', $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        name,
        budgetAllocated,
        JSON.stringify({ weight_profile: weightProfile }),
        JSON.stringify({ runs_completed: 0, last_score: null, last_mode: null }),
      ]
    );
  }

  getOwned(id: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = 'titan-score'`,
      [id, userId]
    );
  }

  createRun(systemId: string, runType: string, outputPayload: Record<string, unknown>) {
    return query(
      `INSERT INTO ecosystem_runs
       (ecosystem_system_id, run_type, status, output_payload, started_at, finished_at)
       VALUES ($1, $2, 'completed', $3, NOW(), NOW())
       RETURNING *`,
      [systemId, runType, JSON.stringify(outputPayload)]
    );
  }

  updateAfterRun(systemId: string, mode: string, primaryScore: number) {
    return query(
      `UPDATE ecosystem_systems
       SET efficiency_score = LEAST(100, GREATEST(0, $3::numeric)),
           metrics = metrics
             || jsonb_build_object(
               'last_mode', $2::text,
               'last_score', $3::int,
               'runs_completed', COALESCE((metrics->>'runs_completed')::int, 0) + 1
             ),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, mode, primaryScore]
    );
  }
}
