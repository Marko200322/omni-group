import type { z } from 'zod';
import { AllocateBudgetDto } from '../dto/resource-management.dto';
import { ResourceManagementRepository } from '../repository/resource-management.repository';

export type AllocateBudgetInput = z.infer<typeof AllocateBudgetDto>;

export type ResourceOverview = {
  budgetAllocated: number;
  realizedRevenue: number;
  roi: number;
};

export class ResourceManagementService {
  private readonly repo = new ResourceManagementRepository();

  async getOverview(): Promise<ResourceOverview> {
    const [alloc, usage] = await Promise.all([
      this.repo.sumBudgetAllocated(),
      this.repo.sumCompletedPayments(),
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
    let { rows: updated } = await this.repo.updateBudgetAllocation(
      userId,
      d.systemSlug,
      d.amount
    );

    if (!updated[0]) {
      await this.repo.insertEcosystemSystem(userId, d.systemSlug);
      const retry = await this.repo.updateBudgetAllocation(
        userId,
        d.systemSlug,
        d.amount
      );
      updated = retry.rows;
    }

    await this.repo.insertAllocateBudgetLog(
      userId,
      `Allocated ${d.amount} to ${d.systemSlug}`,
      JSON.stringify({ reason: d.reason })
    );

    return { allocations: updated, updatedCount: updated.length };
  }
}
