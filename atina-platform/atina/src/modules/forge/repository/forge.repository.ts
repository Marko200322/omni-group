import { query } from '../../../database/connection';
import {
  findRecentEcosystemRunByIdempotencyKey,
  normalizeEcosystemIdempotencyKey,
  withEcosystemIdempotencyLock,
} from '../../../utils/ecosystem-idempotency';

export class ForgeRepository {
  async withIdempotencyLock<T>(systemId: string, idempotencyKey: string, work: () => Promise<T>): Promise<T> {
    return withEcosystemIdempotencyLock(systemId, idempotencyKey, work);
  }

  async createRunAndUpdateWithIdempotency(
    systemId: string,
    runType: string,
    outputPayload: Record<string, unknown>,
    revenueDelta: number,
    mode: string,
    intensity: number,
    idempotencyKey?: string
  ): Promise<{ row: Record<string, unknown>; reused: boolean }> {
    const normalizedKey = normalizeEcosystemIdempotencyKey(idempotencyKey);
    if (!normalizedKey) {
      const { rows } = await this.createRun(systemId, runType, outputPayload);
      await this.updateAfterRun(systemId, revenueDelta, mode, intensity);
      return { row: rows[0] as Record<string, unknown>, reused: false };
    }

    return this.withIdempotencyLock(systemId, normalizedKey, async () => {
      const { rows: existingRows } = await findRecentEcosystemRunByIdempotencyKey(systemId, normalizedKey);
      if (existingRows[0]) {
        return { row: existingRows[0] as Record<string, unknown>, reused: true };
      }

      const { rows } = await this.createRun(systemId, runType, outputPayload);
      await this.updateAfterRun(systemId, revenueDelta, mode, intensity);
      return { row: rows[0] as Record<string, unknown>, reused: false };
    });
  }

  findRecentRunByIdempotencyKey(systemId: string, idempotencyKey: string) {
    return findRecentEcosystemRunByIdempotencyKey(systemId, idempotencyKey);
  }

  listByUser(userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE user_id = $1 AND system_slug = 'forge'
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  create(userId: string, name: string, budgetAllocated: number, operatingMode: string) {
    return query(
      `INSERT INTO ecosystem_systems
       (user_id, system_slug, name, budget_allocated, config, metrics)
       VALUES ($1, 'forge', $2, $3, $4, $5)
       RETURNING *`,
      [
        userId,
        name,
        budgetAllocated,
        JSON.stringify({ operating_mode: operatingMode }),
        JSON.stringify({ runs_completed: 0, smelts: 0, tempers: 0, deploys: 0 }),
      ]
    );
  }

  getOwned(id: string, userId: string) {
    return query(
      `SELECT * FROM ecosystem_systems
       WHERE id = $1 AND user_id = $2 AND system_slug = 'forge'`,
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

  updateAfterRun(systemId: string, revenueDelta: number, mode: string, intensity: number) {
    return query(
      `UPDATE ecosystem_systems
       SET revenue_generated = revenue_generated + $2,
           efficiency_score = LEAST(100, efficiency_score + 2.1),
           metrics = metrics
             || jsonb_build_object('last_mode', $3::text, 'last_intensity', $4::int),
           last_run_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [systemId, revenueDelta, mode, intensity]
    );
  }
}
