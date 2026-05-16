import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate } from '../../api/middleware/auth.middleware';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { query } from '../../database/connection';
import { sendSuccess } from '../../utils/response';
import { getAiClient } from '../../integrations';

export class RecommendationModule implements IModule {
  name = 'Recommendation Module';
  slug = 'recommendation';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.router.get(
      '/next-actions',
      authenticate,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const [subs, tasks, payments] = await Promise.all([
          query<{ count: string }>("SELECT COUNT(*) AS count FROM subscriptions WHERE user_id = $1 AND status = 'active'", [req.user!.userId]),
          query<{ count: string }>("SELECT COUNT(*) AS count FROM tasks WHERE user_id = $1 AND status IN ('failed','retrying')", [req.user!.userId]),
          query<{ count: string }>("SELECT COUNT(*) AS count FROM payments WHERE user_id = $1 AND status = 'failed'", [req.user!.userId]),
        ]);

        const recommendations: string[] = [];
        if (parseInt(subs.rows[0].count, 10) === 0) recommendations.push('Activate a paid subscription to unlock full automation throughput.');
        if (parseInt(tasks.rows[0].count, 10) > 0) recommendations.push('Review failed tasks and retry critical pipelines.');
        if (parseInt(payments.rows[0].count, 10) > 0) recommendations.push('Resolve failed payments to prevent module throttling.');
        if (!recommendations.length) recommendations.push('Scale by enabling additional ecosystem modules (Titanis, OmniTube, OmniGame).');

        const ai = getAiClient();
        if (ai.isConfigured()) {
          const aiResult = await ai.fetchRecommendations({
            userId: req.user!.userId,
            activeSubscriptions: parseInt(subs.rows[0].count, 10),
            failedTasks: parseInt(tasks.rows[0].count, 10),
            failedPayments: parseInt(payments.rows[0].count, 10),
          });
          if (aiResult?.recommendations?.length) {
            recommendations.push(...aiResult.recommendations);
          }
        }

        sendSuccess(res, { recommendations });
      }
    );
  }
}
