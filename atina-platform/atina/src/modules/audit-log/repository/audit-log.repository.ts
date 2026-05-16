import { query } from '../../../database/connection';

export class AuditLogRepository {
  insert(actorUserId: string | null, eventType: string, entityType: string, entityId: string, severity: string, payload: Record<string, unknown>) {
    return query(
      `INSERT INTO audit_events
       (actor_user_id, event_type, entity_type, entity_id, severity, payload)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [actorUserId, eventType, entityType, entityId, severity, JSON.stringify(payload)]
    );
  }

  list(limit: number) {
    return query(
      `SELECT ae.*, u.email AS actor_email
       FROM audit_events ae
       LEFT JOIN users u ON u.id = ae.actor_user_id
       ORDER BY ae.created_at DESC
       LIMIT $1`,
      [limit]
    );
  }
}
