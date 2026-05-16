import { query } from '../../../database/connection';

export class SistemNaplateRepository {
  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = 'sistem-naplate'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  create(userId: string, name: string, budgetAllocated: number, billingCadence: string) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, budget_allocated, config, metrics)
       VALUES ($1, 'sistem-naplate', $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        name,
        budgetAllocated,
        JSON.stringify({ billing_cadence: billingCadence }),
        JSON.stringify({ batches_processed: 0, invoices_generated: 0, settlements_completed: 0 }),
      ]
    );
  }

  getOwned(id: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = 'sistem-naplate'`,
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

  updateAfterRun(systemId: string, mode: string, batchSize: number, processedRecords: number, estimatedRevenue: number) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $5,
           efficiency_score = LEAST(100, efficiency_score + 1.9),
           metrics = metrics
             || jsonb_build_object(
               'last_mode', $2::text,
               'last_batch_size', $3::int,
               'last_records_processed', $4::int,
               'last_estimated_revenue', $5::numeric,
               'batches_processed', COALESCE((metrics->>'batches_processed')::int, 0) + 1,
               'invoices_generated', COALESCE((metrics->>'invoices_generated')::int, 0) + CASE WHEN $2::text = 'invoice' THEN 1 ELSE 0 END,
               'settlements_completed', COALESCE((metrics->>'settlements_completed')::int, 0) + CASE WHEN $2::text = 'settlement' THEN 1 ELSE 0 END
             ),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, mode, batchSize, processedRecords, estimatedRevenue]
    );
  }
}
