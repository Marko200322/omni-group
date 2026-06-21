import { query } from '../../../database/connection';

export type BudgetStateRow = {
  id: number;
  initial_budget_usd: string;
  balance_usd: string;
  total_spent_usd: string;
  total_revenue_usd: string;
  updated_at: string;
};

export type BudgetLedgerRow = {
  id: string;
  entry_type: string;
  category: string;
  amount_usd: string;
  balance_after_usd: string;
  vertical_slug: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export class AutonomyBudgetRepository {
  getState() {
    return query<BudgetStateRow>(`SELECT * FROM autonomy_budget_state WHERE id = 1 LIMIT 1`);
  }

  insertState(initialUsd: number, balanceUsd: number) {
    return query<BudgetStateRow>(
      `INSERT INTO autonomy_budget_state (id, initial_budget_usd, balance_usd, total_spent_usd, total_revenue_usd)
       VALUES (1, $1, $2, 0, 0)
       ON CONFLICT (id) DO NOTHING
       RETURNING *`,
      [initialUsd, balanceUsd]
    );
  }

  updateState(balanceUsd: number, deltaSpent: number, deltaRevenue: number) {
    return query<BudgetStateRow>(
      `UPDATE autonomy_budget_state
       SET balance_usd = $1,
           total_spent_usd = total_spent_usd + $2,
           total_revenue_usd = total_revenue_usd + $3,
           updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [balanceUsd, deltaSpent, deltaRevenue]
    );
  }

  insertLedger(entry: {
    entryType: 'seed' | 'spend' | 'revenue' | 'adjust' | 'topup';
    category: string;
    amountUsd: number;
    balanceAfterUsd: number;
    verticalSlug?: string;
    metadata?: Record<string, unknown>;
  }) {
    return query<BudgetLedgerRow>(
      `INSERT INTO autonomy_budget_ledger
         (entry_type, category, amount_usd, balance_after_usd, vertical_slug, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        entry.entryType,
        entry.category,
        entry.amountUsd,
        entry.balanceAfterUsd,
        entry.verticalSlug ?? null,
        JSON.stringify(entry.metadata ?? {}),
      ]
    );
  }

  sumSpentSince(sinceIso: string) {
    return query<{ total: string }>(
      `SELECT COALESCE(SUM(amount_usd), 0) AS total
       FROM autonomy_budget_ledger
       WHERE entry_type = 'spend' AND created_at >= $1`,
      [sinceIso]
    );
  }

  listLedger(limit: number) {
    return query<BudgetLedgerRow>(
      `SELECT * FROM autonomy_budget_ledger ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
  }
}
