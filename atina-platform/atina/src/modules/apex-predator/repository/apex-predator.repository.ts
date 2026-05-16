import { query } from '../../../database/connection';

export class ApexPredatorRepository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = 'apex-predator'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  create(userId: string, name: string, budgetAllocated: number, riskProfile: string) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, budget_allocated, config, metrics)
       VALUES ($1, 'apex-predator', $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        name,
        budgetAllocated,
        JSON.stringify({ risk_profile: riskProfile, domain_state: 'prospecting' }),
        JSON.stringify({
          conversion_rate: 0,
          retention_rate: 0,
          alerts: 0,
          domain_state: 'prospecting',
          run_count: 0,
        }),
      ]
    );
  }

  getOwned(systemId: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = 'apex-predator'`,
      [systemId, userId]
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

  updateAfterRun(systemId: string, revenueDelta: number, efficiencyDelta: number, mode: string, conversionRate: number, nextState: string) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $2,
           efficiency_score = LEAST(100, efficiency_score + $3),
           config = config || jsonb_build_object('domain_state', $6::text),
           metrics = metrics
             || jsonb_build_object(
               'last_mode', $4::text,
               'last_conversion_rate', $5::numeric,
               'domain_state', $6::text,
               'run_count', COALESCE((metrics->>'run_count')::int, 0) + 1
             ),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, revenueDelta, efficiencyDelta, mode, conversionRate, nextState]
    );
  }

  listRiskGrid() {
    return query(
      `SELECT id, name, efficiency_score, revenue_generated, config->>'risk_profile' AS risk_profile
       FROM ecosystem_systems
       WHERE system_slug = 'apex-predator'
       ORDER BY efficiency_score DESC`
    );
  }
}
