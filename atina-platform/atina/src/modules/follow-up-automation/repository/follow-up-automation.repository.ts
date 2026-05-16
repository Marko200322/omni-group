import { query } from '../../../database/connection';

const SYSTEM_SLUG = 'follow-up-automation';

export class FollowUpAutomationRepository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = $2
       ORDER BY created_at DESC`,
      [userId, SYSTEM_SLUG]
    );
  }

  create(userId: string, name: string, budgetAllocated: number, followUpStrategy: string) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, budget_allocated, config, metrics)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        SYSTEM_SLUG,
        name,
        budgetAllocated,
        JSON.stringify({ follow_up_strategy: followUpStrategy }),
        JSON.stringify({ runs_completed: 0, follow_ups_completed: 0 }),
      ]
    );
  }

  getOwned(id: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = $3`,
      [id, userId, SYSTEM_SLUG]
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

  updateAfterRun(
    systemId: string,
    revenueDelta: number,
    mode: string,
    intensity: number,
    followUpsDelta: number
  ) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $2,
           efficiency_score = LEAST(100, efficiency_score + 1.1),
           metrics = metrics
             || jsonb_build_object(
               'last_mode', $3::text,
               'last_intensity', $4::int,
               'follow_ups_completed', COALESCE((metrics->>'follow_ups_completed')::int, 0) + $5::int
             ),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, revenueDelta, mode, intensity, followUpsDelta]
    );
  }
}
