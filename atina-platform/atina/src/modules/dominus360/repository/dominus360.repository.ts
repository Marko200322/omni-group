import { query } from '../../../database/connection';

const SYSTEM_SLUG = 'dominus360';

export class Dominus360Repository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = $2
       ORDER BY created_at DESC`,
      [userId, SYSTEM_SLUG]
    );
  }

  create(userId: string, name: string, stage: string, budgetAllocated: number) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, stage, budget_allocated, metrics)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, SYSTEM_SLUG, name, stage, budgetAllocated, JSON.stringify({ risk_score: 50, forecasts: 0 })]
    );
  }

  auditCreated(actorUserId: string, entityId: string, payload: Record<string, unknown>) {
    return query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'dominus360_created', 'ecosystem_system', $2, 'info', $3)`,
      [actorUserId, entityId, JSON.stringify(payload)]
    );
  }

  getOwned(id: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = $3`,
      [id, userId, SYSTEM_SLUG]
    );
  }

  createRun(systemId: string, runType: string, inputPayload: Record<string, unknown>, output: Record<string, unknown>) {
    return query(
      `INSERT INTO ecosystem_runs
       (ecosystem_system_id, run_type, status, input_payload, output_payload, started_at, finished_at)
       VALUES ($1, $2, 'completed', $3, $4, NOW(), NOW())
       RETURNING *`,
      [systemId, runType, JSON.stringify(inputPayload), JSON.stringify(output)]
    );
  }

  updateAfterRun(systemId: string, revenueDelta: number, forecastsNext: number) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $2,
           efficiency_score = LEAST(100, efficiency_score + 1.8),
           metrics = jsonb_set(
             COALESCE(metrics, '{}'::jsonb),
             '{forecasts}',
             to_jsonb($3::int)
           ),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, revenueDelta, forecastsNext]
    );
  }

  auditRunCompleted(actorUserId: string, runId: string, payload: Record<string, unknown>) {
    return query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'dominus360_run_completed', 'ecosystem_run', $2, 'info', $3)`,
      [actorUserId, runId, JSON.stringify(payload)]
    );
  }
}
