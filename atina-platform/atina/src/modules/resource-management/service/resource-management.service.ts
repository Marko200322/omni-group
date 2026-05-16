import type { z } from 'zod';
import { query } from '../../../database/connection';
import { AllocateBudgetDto } from '../dto/resource-management.dto';

export type AllocateBudgetInput = z.infer<typeof AllocateBudgetDto>;

export type ResourceOverview = {
  budgetAllocated: number;
  realizedRevenue: number;
  roi: number;
};

export class ResourceManagementService {
  async getOverview(): Promise<ResourceOverview> {
    const [alloc, usage] = await Promise.all([
      query<{ total: string }>('SELECT COALESCE(SUM(budget_allocated),0) AS total FROM ecosystem_systems'),
      query<{ total: string }>(
        "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'completed'"
      ),
    ]);
    const budgetAllocated = parseFloat(alloc.rows[0].total);
    const realizedRevenue = parseFloat(usage.rows[0].total);
    const roi =
      budgetAllocated > 0
        ? Number(((realizedRevenue / budgetAllocated) * 100).toFixed(2))
        : 0;
    return { budgetAllocated, realizedRevenue, roi };
  }

  async allocateBudget(
    userId: string,
    d: AllocateBudgetInput
  ): Promise<{ allocations: unknown[]; updatedCount: number }> {
    let { rows: updated } = await query(
      `UPDATE ecosystem_systems
       SET budget_allocated = budget_allocated + $2,
           updated_at = NOW()
       WHERE system_slug = $1
         AND user_id = $3
       RETURNING id, system_slug, name, budget_allocated`,
      [d.systemSlug, d.amount, userId]
    );

    if (!updated[0]) {
      await query(
        `INSERT INTO ecosystem_systems
         (user_id, system_slug, name, status, stage, budget_allocated, config, metrics)
         VALUES ($1, $2, $3, 'active', 'v1', 0, '{}', '{}')`,
        [userId, d.systemSlug, d.systemSlug]
      );
      const retry = await query(
        `UPDATE ecosystem_systems
         SET budget_allocated = budget_allocated + $2,
             updated_at = NOW()
         WHERE system_slug = $1
           AND user_id = $3
         RETURNING id, system_slug, name, budget_allocated`,
        [d.systemSlug, d.amount, userId]
      );
      updated = retry.rows;
    }

    await query(
      `INSERT INTO logs (user_id, level, category, action, message, context)
       VALUES ($1, 'info', 'resource', 'allocate_budget', $2, $3)`,
      [userId, `Allocated ${d.amount} to ${d.systemSlug}`, JSON.stringify({ reason: d.reason })]
    );

    return { allocations: updated, updatedCount: updated.length };
  }
}
