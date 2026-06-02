import { query } from '../../../database/connection';

export class SubscriptionsRepository {
  listByUser(userId: string) {
    return query(
      `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug, p.features, p.limits
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC`,
      [userId]
    );
  }

  currentForUser(userId: string) {
    return query(
      `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug, p.features, p.limits,
              p.price_monthly, p.price_yearly
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1 AND s.status IN ('active', 'trialing', 'past_due')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId]
    );
  }

  usageCounts(userId: string) {
    return Promise.all([
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM tasks
         WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())`,
        [userId]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM analytics_events
         WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
        [userId]
      ),
    ]);
  }

  usageLimits(userId: string) {
    return query<{ limits: unknown }>(
      `SELECT COALESCE(sub.limits, up.limits) AS limits
       FROM users u
       JOIN plans up ON u.plan_id = up.id
       LEFT JOIN LATERAL (
         SELECT p.limits
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.user_id = u.id AND s.status IN ('active', 'trialing', 'past_due')
         ORDER BY s.created_at DESC
         LIMIT 1
       ) sub ON true
       WHERE u.id = $1`,
      [userId]
    );
  }

  adminListAll(limit: number, offset: number) {
    return Promise.all([
      query<{ count: string }>('SELECT COUNT(*)::text AS count FROM subscriptions', []),
      query(
        `SELECT s.*, u.email, u.name AS user_name, p.name AS plan_name
         FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         JOIN plans p ON s.plan_id = p.id
         ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
        [limit, offset]
      ),
    ]);
  }
}
