import { query } from '../../../database/connection';

export class OutreachRepository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = 'outreach'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  create(userId: string, name: string, budgetAllocated: number, channelFocus: string) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, budget_allocated, config, metrics)
       VALUES ($1, 'outreach', $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        name,
        budgetAllocated,
        JSON.stringify({ channel_focus: channelFocus }),
        JSON.stringify({ runs_completed: 0, messages_sent: 0 }),
      ]
    );
  }

  getOwned(id: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = 'outreach'`,
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

  updateAfterRun(systemId: string, revenueDelta: number, mode: string, intensity: number, messagesDelta: number) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $2,
           efficiency_score = LEAST(100, efficiency_score + 1.2),
           metrics = metrics
             || jsonb_build_object(
               'last_mode', $3::text,
               'last_intensity', $4::int,
               'messages_sent', COALESCE((metrics->>'messages_sent')::int, 0) + $5::int
             ),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, revenueDelta, mode, intensity, messagesDelta]
    );
  }
}
