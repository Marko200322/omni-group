import { query } from '../database/connection';

/**
 * Ecosystem idempotency contract (aligned with Forge / `ecosystem_runs` usage):
 *
 * - **Header**: Clients may send `Idempotency-Key` on mutating ecosystem run requests. The value is
 *   normalized (trim); empty after trim means "no idempotency" (same as omitting the header).
 * - **24h window**: Replay detection uses rows in `ecosystem_runs` with
 *   `output_payload->>'idempotency_key' = <normalized key>` and `created_at >= NOW() - INTERVAL '24 hours'`
 *   for the same `ecosystem_system_id`. Outside that window, a new run may be created even with the same key.
 * - **Concurrency**: `withEcosystemIdempotencyLock` uses PostgreSQL advisory locks per workspace + key so
 *   parallel duplicate requests serialize (modules without DB wiring can still use normalization only; lock/query are no-ops when the key is empty).
 *
 * @see ECOSYSTEM_IDEMPOTENCY_RUN_LOOKBACK_SQL
 */
export const ECOSYSTEM_IDEMPOTENCY_RUN_LOOKBACK_SQL = "NOW() - INTERVAL '24 hours'" as const;

export type EcosystemRunRow = Record<string, unknown> & {
  output_payload?: { idempotency_key?: string | null; mode?: unknown; intensity?: unknown };
};

/**
 * Normalized idempotency key: a non-empty string is active idempotency; `''` means absent / ignored.
 * Use after trimming HTTP header or stored values.
 */
export type EcosystemIdempotencyKeyNormalized = string;

/** Trims a raw key; non-string inputs become `''` (no idempotency). */
export function normalizeEcosystemIdempotencyKey(raw: string | undefined | null): EcosystemIdempotencyKeyNormalized {
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Normalizes the `Idempotency-Key` request header value for ecosystem modules.
 * Express `req.header('Idempotency-Key')` is `string | undefined`; this returns `''` when missing or blank.
 */
export function normalizeIdempotencyKeyHeader(
  header: string | undefined | null
): EcosystemIdempotencyKeyNormalized {
  return normalizeEcosystemIdempotencyKey(header);
}

/**
 * Serializes concurrent runs for the same workspace + idempotency key using PostgreSQL advisory locks.
 * Empty keys skip locking (callers should treat empty as "no idempotency").
 */
export async function withEcosystemIdempotencyLock<T>(
  systemId: string,
  idempotencyKey: string,
  work: () => Promise<T>
): Promise<T> {
  const k = idempotencyKey.trim();
  if (!k) {
    return work();
  }
  await query('SELECT pg_advisory_lock(hashtext($1), hashtext($2))', [systemId, k]);
  try {
    return await work();
  } finally {
    await query('SELECT pg_advisory_unlock(hashtext($1), hashtext($2))', [systemId, k]);
  }
}

/** Find recent completed run for a given idempotency key (stored in output_payload.idempotency_key). */
export function findRecentEcosystemRunByIdempotencyKey(systemId: string, idempotencyKey: string) {
  return query(
    `SELECT *
     FROM ecosystem_runs
     WHERE ecosystem_system_id = $1
       AND created_at >= ${ECOSYSTEM_IDEMPOTENCY_RUN_LOOKBACK_SQL}
       AND output_payload->>'idempotency_key' = $2
     ORDER BY created_at DESC
     LIMIT 1`,
    [systemId, idempotencyKey]
  );
}
