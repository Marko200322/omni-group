import { query } from '../../../database/connection';

export class SelfHealingRepository {
  report(subsystem: string, issueKey: string, details: Record<string, unknown>) {
    return query(
      `INSERT INTO self_heal_events
       (subsystem, issue_key, status, details)
       VALUES ($1,$2,'detected',$3)
       RETURNING *`,
      [subsystem, issueKey, JSON.stringify(details)]
    );
  }

  heal(id: string, remediationAction: string) {
    return query(
      `UPDATE self_heal_events
       SET status = 'healed',
           remediation_action = $2,
           healed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, remediationAction]
    );
  }

  list() {
    return query(`SELECT * FROM self_heal_events ORDER BY created_at DESC LIMIT 200`);
  }

  getById(id: string) {
    return query<{ id: string; subsystem: string; issue_key: string; details: unknown }>(
      `SELECT id, subsystem, issue_key, details
       FROM self_heal_events
       WHERE id = $1
       LIMIT 1`,
      [id]
    );
  }

  findOpen(subsystem: string, issueKey: string) {
    return query<{ id: string }>(
      `SELECT id
       FROM self_heal_events
       WHERE subsystem = $1
         AND issue_key = $2
         AND status = 'detected'
       ORDER BY created_at DESC
       LIMIT 1`,
      [subsystem, issueKey]
    );
  }

  markHealed(id: string, remediationAction: string, details: Record<string, unknown>) {
    return query(
      `UPDATE self_heal_events
       SET status = 'healed',
           remediation_action = $2,
           details = details || $3::jsonb,
           healed_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, remediationAction, JSON.stringify(details)]
    );
  }

  listFailedTasks(limit = 50) {
    return query<{ id: string; user_id: string; type: string; status: string; payload: unknown }>(
      `SELECT id, user_id, type, status, payload
       FROM tasks
       WHERE status IN ('failed', 'retrying')
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  listFailedPayments(limit = 50) {
    return query<{ id: string; user_id: string; provider: string; status: string; metadata: unknown }>(
      `SELECT id, user_id, provider, status, metadata
       FROM payments
       WHERE status = 'failed'
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  listDisconnectedIntegrations(limit = 50) {
    return query<{ id: string; user_id: string; provider_slug: string; status: string }>(
      `SELECT id, user_id, provider_slug, status
       FROM integration_connections
       WHERE status IN ('error', 'inactive')
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit]
    );
  }

  retryTask(taskId: string) {
    return query<{ id: string; user_id: string }>(
      `UPDATE tasks
       SET status = 'queued',
           attempts = attempts + 1,
           error_message = NULL,
           error_details = NULL,
           scheduled_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id`,
      [taskId]
    );
  }

  markPaymentRetrying(paymentId: string) {
    return query<{ id: string; user_id: string; provider: string }>(
      `UPDATE payments
       SET status = 'processing',
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, provider`,
      [paymentId]
    );
  }

  reactivateIntegration(integrationId: string) {
    return query<{ id: string; user_id: string; provider_slug: string }>(
      `UPDATE integration_connections
       SET status = 'active',
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, provider_slug`,
      [integrationId]
    );
  }
}
