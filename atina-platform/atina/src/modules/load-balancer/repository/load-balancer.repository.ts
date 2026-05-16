import { query } from '../../../database/connection';

export class LoadBalancerRepository {
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

  listActive() {
    return query(
      `SELECT * FROM system_nodes
       WHERE is_active = true
       ORDER BY (capacity_score - current_load_score) DESC, updated_at DESC`
    );
  }

  addLoad(id: string, delta: number) {
    return query(
      `UPDATE system_nodes
       SET current_load_score = GREATEST(0, current_load_score + $2),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, delta]
    );
  }
}
