import { query } from '../../../database/connection';

export class IntegrationHubRepository {
  create(
    userId: string,
    providerSlug: string,
    displayName: string,
    credentials: Record<string, unknown>,
    config: Record<string, unknown>
  ) {
    return query(
      `INSERT INTO integration_connections
       (user_id, provider_slug, display_name, credentials_json, config_json)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, providerSlug, displayName, JSON.stringify(credentials), JSON.stringify(config)]
    );
  }

  listByUser(userId: string) {
    return query(
      `SELECT id, provider_slug, display_name, status, config_json, last_sync_at, created_at
       FROM integration_connections
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
  }

  touchSync(integrationId: string, userId: string) {
    return query(
      `UPDATE integration_connections
       SET last_sync_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, provider_slug, display_name, last_sync_at`,
      [integrationId, userId]
    );
  }

  /**
   * Ensures an `ecosystem_systems` row exists with the same primary key as the integration connection
   * so `ecosystem_runs` (idempotency) can reference it. Safe to call repeatedly.
   */
  ensureShadowEcosystemForIntegration(
    integrationId: string,
    userId: string,
    displayName: string,
    providerSlug: string
  ) {
    return query(
      `INSERT INTO ecosystem_systems
       (id, user_id, system_slug, name, status, stage, budget_allocated, config, metrics)
       VALUES ($1, $2, 'integration-hub', $3, 'active', 'v1', 0,
               jsonb_build_object('integration_connection_id', $1::text, 'provider_slug', $4::text),
               '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [integrationId, userId, displayName, providerSlug]
    );
  }

  createRun(integrationId: string, runType: string, outputPayload: Record<string, unknown>) {
    return query(
      `INSERT INTO ecosystem_runs
       (ecosystem_system_id, run_type, status, output_payload, started_at, finished_at)
       VALUES ($1, $2, 'completed', $3, NOW(), NOW())
       RETURNING *`,
      [integrationId, runType, JSON.stringify(outputPayload)]
    );
  }
}
