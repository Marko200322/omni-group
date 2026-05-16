import { Router } from 'express';
import { IModule } from '../../core/ModuleRegistry';
import { authenticate, requireAdmin } from '../../api/middleware/auth.middleware';
import { query } from '../../database/connection';
import { sendSuccess } from '../../utils/response';
import { clientIpFromForwardedFor, headerFirst } from '../../utils/http-headers';
import { z } from 'zod';
import { validateBody, validateQuery } from '../../api/middleware/validate.middleware';
import { StrictEmptyBodyDto } from '../../api/dto/strict-empty-body.dto';
import { StrictEmptyQueryDto } from '../../api/dto/strict-empty-query.dto';

const TrackEventDto = z.object({
  eventName: z.string().min(1).max(100),
  properties: z.record(z.unknown()).default({}),
  sessionId: z.string().optional(),
}).strict();

const AnalyticsDashboardQueryDto = z
  .object({
    range: z.preprocess(
      (v) => (v === undefined || v === '' ? undefined : v),
      z.string().optional()
    ),
  })
  .strict();

const AnalyticsEventsQueryDto = z.object({
  page: z.preprocess(
    (v) => (v === undefined || v === '' ? 1 : v),
    z.coerce.number().int().min(1)
  ),
  limit: z.preprocess(
    (v) => (v === undefined || v === '' ? 50 : v),
    z.coerce.number().int().min(1).max(100)
  ),
}).strict();

export class AnalyticsModule implements IModule {
  name = 'Analytics';
  slug = 'analytics';
  version = '1.0.0';
  isCore = false;
  requiredPlan = 'pro';
  router: Router;

  constructor() {
    this.router = Router();
  }

  async initialize(): Promise<void> {
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Track event
    this.router.post('/track', authenticate, validateQuery(StrictEmptyQueryDto), validateBody(TrackEventDto), async (req, res) => {
      const { eventName, properties, sessionId } = req.body;
      await query(
        `INSERT INTO analytics_events (user_id, event_name, properties, session_id, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          req.user!.userId, eventName, JSON.stringify(properties),
          sessionId || null,
          clientIpFromForwardedFor(req.headers, req.socket.remoteAddress) || null,
          headerFirst(req.headers['user-agent']) || null,
        ]
      );
      sendSuccess(res, null, 'Event tracked');
    });

    // User dashboard
    this.router.get(
      '/dashboard',
      authenticate,
      validateQuery(AnalyticsDashboardQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
      const userId = req.user!.userId;
      const { range: rangeRaw } = req.query as unknown as z.infer<typeof AnalyticsDashboardQueryDto>;
      const days = Math.min(parseInt(rangeRaw ?? '30', 10) || 30, 365);

      const [
        taskStats,
        recentTasks,
        eventCounts,
        topEvents,
      ] = await Promise.all([
        query<{ status: string; count: string }>(
          `SELECT status, COUNT(*) FROM tasks
           WHERE user_id = $1 AND created_at >= NOW() - ($2::integer * INTERVAL '1 day')
           GROUP BY status`,
          [userId, days]
        ),
        query(
          `SELECT * FROM tasks WHERE user_id = $1
           ORDER BY created_at DESC LIMIT 5`, [userId]
        ),
        query<{ date: string; count: string }>(
          `SELECT DATE(created_at) AS date, COUNT(*) AS count
           FROM analytics_events
           WHERE user_id = $1 AND created_at >= NOW() - ($2::integer * INTERVAL '1 day')
           GROUP BY DATE(created_at)
           ORDER BY date`, [userId, days]
        ),
        query<{ event_name: string; count: string }>(
          `SELECT event_name, COUNT(*) FROM analytics_events
           WHERE user_id = $1 AND created_at >= NOW() - ($2::integer * INTERVAL '1 day')
           GROUP BY event_name ORDER BY count DESC LIMIT 10`, [userId, days]
        ),
      ]);

      sendSuccess(res, {
        period: `${days} days`,
        tasks: {
          byStatus: Object.fromEntries(taskStats.rows.map(r => [r.status, parseInt(r.count, 10)])),
          recent: recentTasks.rows,
        },
        events: {
          daily: eventCounts.rows.map(r => ({ date: r.date, count: parseInt(r.count, 10) })),
          top: topEvents.rows.map(r => ({ name: r.event_name, count: parseInt(r.count, 10) })),
        },
      });
      }
    );

    // Admin platform analytics
    this.router.get(
      '/admin/overview',
      authenticate,
      requireAdmin,
      validateQuery(StrictEmptyQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (_req, res) => {
      const [
        userGrowth,
        revenueData,
        planDistribution,
        taskVolume,
        topPlans,
      ] = await Promise.all([
        query<{ date: string; count: string }>(
          `SELECT DATE(created_at) AS date, COUNT(*) AS count
           FROM users
           WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at) ORDER BY date`
        ),
        query<{ date: string; total: string }>(
          `SELECT DATE(created_at) AS date, SUM(amount) AS total
           FROM payments
           WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at) ORDER BY date`
        ),
        query<{ plan_slug: string; count: string }>(
          `SELECT p.slug AS plan_slug, COUNT(u.id) AS count
           FROM users u JOIN plans p ON u.plan_id = p.id
           GROUP BY p.slug`
        ),
        query<{ date: string; count: string }>(
          `SELECT DATE(created_at) AS date, COUNT(*) AS count
           FROM tasks WHERE created_at >= NOW() - INTERVAL '30 days'
           GROUP BY DATE(created_at) ORDER BY date`
        ),
        query<{ name: string; count: string; revenue: string }>(
          `SELECT p.name, COUNT(s.id) AS count, SUM(pay.amount) AS revenue
           FROM plans p
           LEFT JOIN subscriptions s ON s.plan_id = p.id AND s.status = 'active'
           LEFT JOIN payments pay ON pay.subscription_id = s.id AND pay.status = 'completed'
           GROUP BY p.id, p.name ORDER BY count DESC`
        ),
      ]);

      const [totalUsers, totalRevenue, activeSubscriptions] = await Promise.all([
        query<{ count: string }>('SELECT COUNT(*) FROM users WHERE is_active = true'),
        query<{ total: string }>(
          `SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'completed'`
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) FROM subscriptions WHERE status = 'active'`
        ),
      ]);

      sendSuccess(res, {
        summary: {
          totalUsers: parseInt(totalUsers.rows[0].count, 10),
          totalRevenue: parseFloat(totalRevenue.rows[0].total),
          activeSubscriptions: parseInt(activeSubscriptions.rows[0].count, 10),
        },
        userGrowth: userGrowth.rows.map(r => ({ date: r.date, count: parseInt(r.count, 10) })),
        revenue: revenueData.rows.map(r => ({ date: r.date, total: parseFloat(r.total) })),
        planDistribution: planDistribution.rows.map(r => ({ plan: r.plan_slug, count: parseInt(r.count, 10) })),
        taskVolume: taskVolume.rows.map(r => ({ date: r.date, count: parseInt(r.count, 10) })),
        topPlans: topPlans.rows,
      });
      }
    );

    // User event history
    this.router.get(
      '/events',
      authenticate,
      validateQuery(AnalyticsEventsQueryDto),
      validateBody(StrictEmptyBodyDto),
      async (req, res) => {
        const { page, limit } = req.query as unknown as z.infer<typeof AnalyticsEventsQueryDto>;
        const offset = (page - 1) * limit;

        const { rows } = await query(
          `SELECT * FROM analytics_events WHERE user_id = $1
           ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          [req.user!.userId, limit, offset]
        );
        sendSuccess(res, rows);
      }
    );
  }
}
