import { clientIpFromForwardedFor, headerFirst } from '../../../utils/http-headers';
import type { Request } from 'express';
import type {
  AnalyticsDashboardQueryDtoType,
  AnalyticsEventsQueryDtoType,
  TrackEventDtoType,
} from '../dto/analytics.dto';
import { AnalyticsRepository } from '../repository/analytics.repository';

export class AnalyticsService {
  private readonly repo = new AnalyticsRepository();

  async track(userId: string, dto: TrackEventDtoType, req: Request) {
    await this.repo.trackEvent({
      userId,
      eventName: dto.eventName,
      properties: dto.properties,
      sessionId: dto.sessionId ?? null,
      ipAddress: clientIpFromForwardedFor(req.headers, req.socket.remoteAddress) || null,
      userAgent: headerFirst(req.headers['user-agent']) || null,
    });
  }

  async dashboard(userId: string, query: AnalyticsDashboardQueryDtoType) {
    const days = Math.min(parseInt(query.range ?? '30', 10) || 30, 365);
    const [taskStats, recentTasks, eventCounts, topEvents] = await this.repo.dashboardData(
      userId,
      days
    );
    return {
      period: `${days} days`,
      tasks: {
        byStatus: Object.fromEntries(
          taskStats.rows.map((r) => [r.status, parseInt(r.count, 10)])
        ),
        recent: recentTasks.rows,
      },
      events: {
        daily: eventCounts.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
        top: topEvents.rows.map((r) => ({ name: r.event_name, count: parseInt(r.count, 10) })),
      },
    };
  }

  async adminOverview() {
    const [
      userGrowth,
      revenueData,
      planDistribution,
      taskVolume,
      topPlans,
      totalUsers,
      totalRevenue,
      activeSubscriptions,
    ] = await this.repo.adminOverview();
    return {
      summary: {
        totalUsers: parseInt(totalUsers.rows[0]?.count ?? '0', 10),
        totalRevenue: parseFloat(totalRevenue.rows[0]?.total ?? '0'),
        activeSubscriptions: parseInt(activeSubscriptions.rows[0]?.count ?? '0', 10),
      },
      userGrowth: userGrowth.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
      revenue: revenueData.rows.map((r) => ({ date: r.date, total: parseFloat(r.total) })),
      planDistribution: planDistribution.rows.map((r) => ({
        plan: r.plan_slug,
        count: parseInt(r.count, 10),
      })),
      taskVolume: taskVolume.rows.map((r) => ({ date: r.date, count: parseInt(r.count, 10) })),
      topPlans: topPlans.rows,
    };
  }

  async listEvents(userId: string, query: AnalyticsEventsQueryDtoType) {
    const offset = (query.page - 1) * query.limit;
    const { rows } = await this.repo.listEvents(userId, query.limit, offset);
    return rows;
  }
}
