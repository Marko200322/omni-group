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

  setFlag(phase: string, notes: string) {
    return query(
      `UPDATE modules
       SET config = jsonb_build_object('current_phase', $1::text, 'notes', $2::text, 'updated_at', NOW()::text),
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
