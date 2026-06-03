import { query } from '../../../database/connection';

export class RecommendationRepository {
  countActiveSubscriptions(userId: string) {
    return query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM subscriptions WHERE user_id = $1 AND status = 'active'",
      [userId]
    );
  }

  countFailedTasks(userId: string) {
    return query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1 AND status IN ('failed','retrying')",
      [userId]
    );
  }

  countFailedPayments(userId: string) {
    return query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM payments WHERE user_id = $1 AND status = 'failed'",
      [userId]
    );
  }
}
