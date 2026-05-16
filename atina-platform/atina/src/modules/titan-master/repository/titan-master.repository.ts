import { query } from '../../../database/connection';

export class TitanMasterRepository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = 'titan-master'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  create(userId: string, name: string, stage: string, budgetAllocated: number, objective: string) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, stage, budget_allocated, config, metrics)
       VALUES ($1, 'titan-master', $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        name,
        stage,
        budgetAllocated,
        JSON.stringify({ objective }),
        JSON.stringify({ decisions: 0, optimizations: 0 }),
      ]
    );
  }

  getOwned(id: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = 'titan-master'`,
      [id, userId]
    );
  }

  createRun(
    systemId: string,
    runType: string,
    inputPayload: Record<string, unknown>,
    outputPayload: Record<string, unknown>
  ) {
    return query(
      `INSERT INTO ecosystem_runs
       (ecosystem_system_id, run_type, status, input_payload, output_payload, started_at, finished_at)
       VALUES ($1, $2, 'completed', $3, $4, NOW(), NOW())
       RETURNING *`,
      [systemId, runType, JSON.stringify(inputPayload), JSON.stringify(outputPayload)]
    );
  }

  updateAfterRun(systemId: string, projectedGain: number) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $2,
           efficiency_score = LEAST(100, efficiency_score + 2.5),
           metrics = jsonb_set(
             COALESCE(metrics, '{}'::jsonb),
             '{decisions}',
             to_jsonb(COALESCE((metrics->>'decisions')::int, 0) + 1)
           ),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, projectedGain]
    );
  }

  getAdminOverview() {
    return query(
      `SELECT COUNT(*)::int AS systems,
              COALESCE(SUM(revenue_generated), 0)::numeric AS revenue,
              COALESCE(AVG(efficiency_score), 0)::numeric AS avg_efficiency
       FROM ecosystem_systems
       WHERE system_slug = 'titan-master'`
    );
  }
}
