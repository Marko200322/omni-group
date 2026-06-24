import { query } from '../../../database/connection';

export class PhaseLaunchRepository {
  ensureFlag() {
    return query(
      `INSERT INTO modules (name, slug, description, is_core, config)
       VALUES ('Phase Launch Controller', 'phase-launch-control', 'Central phase switch', true, $1::jsonb)
       ON CONFLICT (slug) DO NOTHING`,
      [JSON.stringify({ current_phase: 'v1', notes: '' })]
    );
  }

  getFlag() {
    return query(
      `SELECT config FROM modules WHERE slug = 'phase-launch-control' LIMIT 1`
    );
  }

  async getFullConfig(): Promise<Record<string, unknown>> {
    const { rows } = await this.getFlag();
    return (rows[0]?.config ?? {}) as Record<string, unknown>;
  }

  mergeConfig(partial: Record<string, unknown>) {
    return query(
      `UPDATE modules
       SET config = COALESCE(config, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE slug = 'phase-launch-control'`,
      [JSON.stringify(partial)]
    );
  }

  setFlag(phase: string, notes: string) {
    return query(
      `UPDATE modules
       SET config = COALESCE(config, '{}'::jsonb)
         || jsonb_build_object(
           'current_phase', $1::text,
           'notes', $2::text,
           'updated_at', to_jsonb(NOW()::text)
         ),
           updated_at = NOW()
       WHERE slug = 'phase-launch-control'`,
      [phase, notes]
    );
  }

  insertPhaseLaunchAudit(actorUserId: string, payloadJson: string) {
    return query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1, 'phase_launch_updated', 'system', 'phase-launch-control', 'info', $2)`,
      [actorUserId, payloadJson]
    );
  }
}
