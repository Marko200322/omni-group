import { query } from '../../../database/connection';
import { getAiClient } from '../../../integrations';

export class RecommendationService {
  private readonly ai = getAiClient();

  async getNextActions(userId: string): Promise<{ recommendations: string[] }> {
    const [subs, tasks, payments] = await Promise.all([
      query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM subscriptions WHERE user_id = $1 AND status = 'active'",
        [userId]
      ),
      query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1 AND status IN ('failed','retrying')",
        [userId]
      ),
      query<{ count: string }>(
        "SELECT COUNT(*) AS count FROM payments WHERE user_id = $1 AND status = 'failed'",
        [userId]
      ),
    ]);

    const recommendations: string[] = [];
    if (parseInt(subs.rows[0].count, 10) === 0) {
      recommendations.push('Activate a paid subscription to unlock full automation throughput.');
    }
    if (parseInt(tasks.rows[0].count, 10) > 0) {
      recommendations.push('Review failed tasks and retry critical pipelines.');
    }
    if (parseInt(payments.rows[0].count, 10) > 0) {
      recommendations.push('Resolve failed payments to prevent module throttling.');
    }
    if (!recommendations.length) {
      recommendations.push('Scale by enabling additional ecosystem modules (Titanis, OmniTube, OmniGame).');
    }

    if (this.ai.isConfigured()) {
      const aiResult = await this.ai.fetchRecommendations({
        userId,
        activeSubscriptions: parseInt(subs.rows[0].count, 10),
        failedTasks: parseInt(tasks.rows[0].count, 10),
        failedPayments: parseInt(payments.rows[0].count, 10),
      });
      if (aiResult?.recommendations?.length) {
        recommendations.push(...aiResult.recommendations);
      }
    }

    return { recommendations };
  }
}
