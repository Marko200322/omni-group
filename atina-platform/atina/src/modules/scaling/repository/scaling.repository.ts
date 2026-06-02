import { query } from '../../../database/connection';

export class ScalingRepository {
  listActive() {
    return query(
      `SELECT * FROM system_nodes
       WHERE is_active = true
       ORDER BY node_name ASC`
    );
  }

  avgUtilization() {
    return query<{ avg_util: string; node_count: string }>(
      `SELECT
         COALESCE(AVG(
           CASE WHEN capacity_score > 0
             THEN (current_load_score::float / capacity_score::float) * 100
             ELSE 0
           END
         ), 0)::text AS avg_util,
         COUNT(*)::text AS node_count
       FROM system_nodes
       WHERE is_active = true`
    );
  }

  register(nodeName: string, zone: string, capacityScore: number, metadata: Record<string, unknown>) {
    return query(
      `INSERT INTO system_nodes (node_name, zone, capacity_score, metadata)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (node_name) DO UPDATE
         SET zone = EXCLUDED.zone,
             capacity_score = EXCLUDED.capacity_score,
             metadata = EXCLUDED.metadata,
             updated_at = NOW()
       RETURNING *`,
      [nodeName, zone, capacityScore, JSON.stringify(metadata)]
    );
  }
}
