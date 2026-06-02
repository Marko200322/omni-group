import { query } from '../../../database/connection';

export class AnalyticsRepository {
  trackEvent(row: {
    userId: string;
    eventName: string;
    properties: Record<string, unknown>;
    sessionId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
  }) {
    return query(
      `INSERT INTO analytics_events (user_id, event_name, properties, session_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        row.userId,
        row.eventName,
        JSON.stringify(row.properties),
        row.sessionId,
        row.ipAddress,
        row.userAgent,
      ]
    );
  }

  dashboardData(userId: string, days: number) {
    return Promise.all([
      query<{ status: string; count: string }>(
        `SELECT status, COUNT(*)::text AS count FROM tasks
         WHERE user_id = $1 AND created_at >= NOW() - ($2::integer * INTERVAL '1 day')
         GROUP BY status`,
        [userId, days]
      ),
      query(`SELECT * FROM tasks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [userId]),
      query<{ date: string; count: string }>(
        `SELECT DATE(created_at) AS date, COUNT(*)::text AS count
         FROM analytics_events
         WHERE user_id = $1 AND created_at >= NOW() - ($2::integer * INTERVAL '1 day')
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [userId, days]
      ),
      query<{ event_name: string; count: string }>(
        `SELECT event_name, COUNT(*)::text AS count FROM analytics_events
         WHERE user_id = $1 AND created_at >= NOW() - ($2::integer * INTERVAL '1 day')
         GROUP BY event_name ORDER BY count DESC LIMIT 10`,
        [userId, days]
      ),
    ]);
  }

  adminOverview() {
    return Promise.all([
      query<{ date: string; count: string }>(
        `SELECT DATE(created_at) AS date, COUNT(*)::text AS count
         FROM users
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY date`
      ),
      query<{ date: string; total: string }>(
        `SELECT DATE(created_at) AS date, SUM(amount)::text AS total
         FROM payments
         WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY date`
      ),
      query<{ plan_slug: string; count: string }>(
        `SELECT p.slug AS plan_slug, COUNT(u.id)::text AS count
         FROM users u JOIN plans p ON u.plan_id = p.id
         GROUP BY p.slug`
      ),
      query<{ date: string; count: string }>(
        `SELECT DATE(created_at) AS date, COUNT(*)::text AS count
         FROM tasks WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(created_at) ORDER BY date`
      ),
      query<{ name: string; count: string; revenue: string }>(
        `SELECT p.name, COUNT(s.id)::text AS count, COALESCE(SUM(pay.amount), 0)::text AS revenue
         FROM plans p
         LEFT JOIN subscriptions s ON s.plan_id = p.id AND s.status = 'active'
         LEFT JOIN payments pay ON pay.subscription_id = s.id AND pay.status = 'completed'
         GROUP BY p.id, p.name ORDER BY count DESC`
      ),
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM users WHERE is_active = true'),
      query<{ total: string }>(
        `SELECT COALESCE(SUM(amount), 0)::text AS total FROM payments WHERE status = 'completed'`
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM subscriptions WHERE status = 'active'`
      ),
    ]);
  }

  listEvents(userId: string, limit: number, offset: number) {
    return query(
      `SELECT * FROM analytics_events WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
  }
}
