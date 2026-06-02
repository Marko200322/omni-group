import { query } from '../../../database/connection';

export type AlertRow = {
  id: string;
  user_id: string | null;
  severity: string;
  category: string;
  title: string;
  message: string;
  status: string;
  source_module: string | null;
  metadata: Record<string, unknown>;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export class AlertSystemRepository {
  create(
    userId: string | null,
    dto: {
      title: string;
      message: string;
      severity: string;
      category: string;
      sourceModule?: string;
      metadata: Record<string, unknown>;
    }
  ) {
    return query<AlertRow>(
      `INSERT INTO system_alerts
         (user_id, severity, category, title, message, source_module, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        dto.severity,
        dto.category,
        dto.title,
        dto.message,
        dto.sourceModule ?? null,
        JSON.stringify(dto.metadata),
      ]
    );
  }

  listByUser(
    userId: string,
    opts: { status?: string; severity?: string; limit: number; offset: number }
  ) {
    const conditions = ['(user_id = $1 OR user_id IS NULL)'];
    const values: unknown[] = [userId];
    let idx = 2;

    if (opts.status) {
      conditions.push(`status = $${idx++}`);
      values.push(opts.status);
    }
    if (opts.severity) {
      conditions.push(`severity = $${idx++}`);
      values.push(opts.severity);
    }

    const where = conditions.join(' AND ');
    return query<AlertRow>(
      `SELECT * FROM system_alerts
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, opts.limit, opts.offset]
    );
  }

  countByUser(userId: string, opts: { status?: string; severity?: string }) {
    const conditions = ['(user_id = $1 OR user_id IS NULL)'];
    const values: unknown[] = [userId];
    let idx = 2;

    if (opts.status) {
      conditions.push(`status = $${idx++}`);
      values.push(opts.status);
    }
    if (opts.severity) {
      conditions.push(`severity = $${idx++}`);
      values.push(opts.severity);
    }

    return query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM system_alerts WHERE ${conditions.join(' AND ')}`,
      values
    );
  }

  getOwned(id: string, userId: string) {
    return query<AlertRow>(
      `SELECT * FROM system_alerts
       WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)`,
      [id, userId]
    );
  }

  acknowledge(id: string, userId: string) {
    return query<AlertRow>(
      `UPDATE system_alerts
       SET status = 'acknowledged',
           acknowledged_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) AND status = 'open'
       RETURNING *`,
      [id, userId]
    );
  }

  resolve(id: string, userId: string) {
    return query<AlertRow>(
      `UPDATE system_alerts
       SET status = 'resolved',
           resolved_at = NOW(),
           updated_at = NOW()
       WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)
         AND status IN ('open', 'acknowledged')
       RETURNING *`,
      [id, userId]
    );
  }

  summaryByUser(userId: string) {
    return query<{ severity: string; status: string; count: string }>(
      `SELECT severity, status, COUNT(*)::text AS count
       FROM system_alerts
       WHERE user_id = $1 OR user_id IS NULL
       GROUP BY severity, status`,
      [userId]
    );
  }

  listOpenAdmin(limit: number) {
    return query<AlertRow>(
      `SELECT * FROM system_alerts
       WHERE status = 'open'
       ORDER BY
         CASE severity
           WHEN 'critical' THEN 0
           WHEN 'error' THEN 1
           WHEN 'warning' THEN 2
           ELSE 3
         END,
         created_at DESC
       LIMIT $1`,
      [limit]
    );
  }
}
