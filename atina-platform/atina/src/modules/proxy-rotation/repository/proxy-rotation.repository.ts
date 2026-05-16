import { query } from '../../../database/connection';

export class ProxyRotationRepository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = 'proxy-rotation'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  create(userId: string, name: string, budgetAllocated: number, poolSize: number) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, budget_allocated, config, metrics)
       VALUES ($1, 'proxy-rotation', $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        name,
        budgetAllocated,
        JSON.stringify({ pool_size: poolSize, rotation_index: 0 }),
        JSON.stringify({ runs_completed: 0, rotations: 0 }),
      ]
    );
  }

  getOwned(id: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = 'proxy-rotation'`,
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

  updateAfterRun(
    systemId: string,
    revenueDelta: number,
    mode: string,
    intensity: number,
    nextIndex: number,
    proxyId: string
  ) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $2,
           efficiency_score = LEAST(100, efficiency_score + 0.8),
           config = COALESCE(config, '{}'::jsonb) || jsonb_build_object('rotation_index', $5::int),
           metrics = COALESCE(metrics, '{}'::jsonb)
             || jsonb_build_object(
               'last_mode', $3::text,
               'last_intensity', $4::int,
               'rotations', COALESCE((metrics->>'rotations')::int, 0) + 1,
               'last_proxy_id', $6::text
             ),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, revenueDelta, mode, intensity, nextIndex, proxyId]
    );
  }
}
