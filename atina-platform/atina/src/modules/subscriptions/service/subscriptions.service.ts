import type { StrictPaginationQuery } from '../../../api/dto/pagination-query.dto';
import { SubscriptionsRepository } from '../repository/subscriptions.repository';

export class SubscriptionsService {
  private readonly repo = new SubscriptionsRepository();

  async list(userId: string) {
    const { rows } = await this.repo.listByUser(userId);
    return rows;
  }

  async current(userId: string) {
    const { rows } = await this.repo.currentForUser(userId);
    return rows[0] ?? null;
  }

  async usage(userId: string) {
    const [counts, planRows] = await Promise.all([
      this.repo.usageCounts(userId),
      this.repo.usageLimits(userId),
    ]);
    const [tasksThisMonth, requestsToday] = counts;
    return {
      tasksThisMonth: parseInt(tasksThisMonth.rows[0]?.count ?? '0', 10),
      requestsToday: parseInt(requestsToday.rows[0]?.count ?? '0', 10),
      limits: (planRows.rows[0] as { limits?: Record<string, unknown> })?.limits ?? {},
    };
  }

  async adminListAll(query: StrictPaginationQuery) {
    const offset = (query.page - 1) * query.limit;
    const [countResult, listResult] = await this.repo.adminListAll(query.limit, offset);
    return {
      rows: listResult.rows,
      total: parseInt(countResult.rows[0]?.count ?? '0', 10),
      page: query.page,
      limit: query.limit,
    };
  }
}
