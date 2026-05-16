import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { query } from '../../database/connection';
import { sendSuccess, paginate } from '../../utils/response';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';
import { z } from 'zod';
import { AdminSubscriptionsQueryDto } from './dto/subscriptions.dto';

export class SubscriptionsModule implements IModule {
  name = 'Subscriptions';
  slug = 'subscriptions';
  version = '1.0.0';
  isCore = true;
  router: Router;

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), async (req, res) => {
      const { rows } = await query(
        `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug, p.features, p.limits
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.user_id = $1
         ORDER BY s.created_at DESC`,
        [req.user!.userId]
      );
      sendSuccess(res, rows);
    });

    this.router.get('/current', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), async (req, res) => {
      const { rows } = await query(
        `SELECT s.*, p.name AS plan_name, p.slug AS plan_slug, p.features, p.limits,
                p.price_monthly, p.price_yearly
         FROM subscriptions s
         JOIN plans p ON s.plan_id = p.id
         WHERE s.user_id = $1 AND s.status IN ('active', 'trialing', 'past_due')
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [req.user!.userId]
      );
      sendSuccess(res, rows[0] || null);
    });

    this.router.get('/usage', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(StrictEmptyBodyDto), async (req, res) => {
      const userId = req.user!.userId;
      const [tasksThisMonth, requestsToday] = await Promise.all([
        query<{ count: string }>(
          `SELECT COUNT(*) FROM tasks
           WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())`,
          [userId]
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) FROM analytics_events
           WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
          [userId]
        ),
      ]);

      /** N3-E2: Prefer limits from the user's current billable subscription plan; fall back to users.plan_id when none. */
      const { rows: planRows } = await query<{ limits: unknown }>(
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

      sendSuccess(res, {
        tasksThisMonth: parseInt(tasksThisMonth.rows[0].count, 10),
        requestsToday: parseInt(requestsToday.rows[0].count, 10),
        limits: (planRows[0] as any)?.limits || {},
      });
    });

    // Admin
    this.router.get(
      '/admin/all',
      authenticate,
      requireAdmin,
      validateQuery(AdminSubscriptionsQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { page, limit } = req.query as unknown as z.infer<typeof AdminSubscriptionsQueryDto>;
        const offset = (page - 1) * limit;
        const { rows: countRows } = await query<{ count: string }>('SELECT COUNT(*) FROM subscriptions', []);
        const { rows } = await query(
          `SELECT s.*, u.email, u.name AS user_name, p.name AS plan_name
           FROM subscriptions s
           JOIN users u ON s.user_id = u.id
           JOIN plans p ON s.plan_id = p.id
           ORDER BY s.created_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        );
        paginate(res, rows, parseInt(countRows[0].count, 10), page, limit);
      }
    );
  }
}
