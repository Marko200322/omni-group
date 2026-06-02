import { query } from '../../../database/connection';

export type EcosystemAllocationRow = {
  id: string;
  system_slug: string;
  name: string;
  budget_allocated: number;
};

export class ResourceManagementRepository {
  sumBudgetAllocated() {
    return query<{ total: string }>(
      'SELECT COALESCE(SUM(budget_allocated),0) AS total FROM ecosystem_systems'
    );
  }

  sumCompletedPayments() {
    return query<{ total: string }>(
      "SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status = 'completed'"
    );
  }

  updateBudgetAllocation(userId: string, systemSlug: string, amount: number) {
    return query<EcosystemAllocationRow>(
      `UPDATE ecosystem_systems
       SET budget_allocated = budget_allocated + $2,
           updated_at = NOW()
       WHERE system_slug = $1
         AND user_id = $3
       RETURNING id, system_slug, name, budget_allocated`,
      [systemSlug, amount, userId]
    );
  }

  insertEcosystemSystem(userId: string, systemSlug: string) {
    return query(
      `INSERT INTO ecosystem_systems
         (user_id, system_slug, name, status, stage, budget_allocated, config, metrics)
       VALUES ($1, $2, $3, 'active', 'v1', 0, '{}', '{}')`,
      [userId, systemSlug, systemSlug]
    );
  }

  insertAllocateBudgetLog(userId: string, message: string, contextJson: string) {
    return query(
      `INSERT INTO logs (user_id, level, category, action, message, context)
       VALUES ($1, 'info', 'resource', 'allocate_budget', $2, $3)`,
      [userId, message, contextJson]
    );
  }
}
