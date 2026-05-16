import { query } from '../../../database/connection';

export class TitanisRepository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = 'titanis'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  create(userId: string, name: string, budgetAllocated: number, outreachChannel: string) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, budget_allocated, config, metrics)
       VALUES ($1, 'titanis', $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        name,
        budgetAllocated,
        JSON.stringify({ outreach_channel: outreachChannel }),
        JSON.stringify({ leads: 0, follow_ups: 0, closed_deals: 0 }),
      ]
    );
  }

  getOwned(id: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = 'titanis'`,
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

  updateAfterRun(systemId: string, revenueDelta: number, mode: string, leadsDelta: number) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $2,
           efficiency_score = LEAST(100, efficiency_score + 2.1),
           metrics = metrics
             || jsonb_build_object('last_mode', $3::text, 'last_leads', $4::int),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, revenueDelta, mode, leadsDelta]
    );
  }

  auditWorkspaceCreated(actorUserId: string, systemId: string, payload: Record<string, unknown>) {
    return query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'titanis_created', 'ecosystem_system', $2, 'info', $3)`,
      [actorUserId, systemId, JSON.stringify(payload)]
    );
  }

  auditRunCompleted(actorUserId: string, runId: string, payload: Record<string, unknown>) {
    return query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'titanis_run_completed', 'ecosystem_run', $2, 'info', $3)`,
      [actorUserId, runId, JSON.stringify(payload)]
    );
  }
}
