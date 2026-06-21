import { config } from '../../../config';
import { PaymentError } from '../../../utils/errors';
import { AutonomyBudgetRepository } from '../repository/autonomy-budget.repository';

export type SpendGuardResult =
  | { ok: true; amountUsd: number; balanceAfter: number }
  | { ok: false; reason: string; amountUsd: number };

export type BudgetStatus = {
  initialUsd: number;
  balanceUsd: number;
  totalSpentUsd: number;
  totalRevenueUsd: number;
  minReserveUsd: number;
  maxSpendPerTickUsd: number;
  maxSpendPerDayUsd: number;
  spentTodayUsd: number;
  marketingEnabled: boolean;
  hardStop: boolean;
  recentLedger: Array<Record<string, unknown>>;
};

export type TickSpendTracker = {
  spentUsd: number;
};

export function createTickSpendTracker(): TickSpendTracker {
  return { spentUsd: 0 };
}

export class AutonomyBudgetService {
  private readonly repo = new AutonomyBudgetRepository();

  async ensureInitialized(): Promise<void> {
    const { rows } = await this.repo.getState();
    if (rows[0]) return;
    const initial = config.autonomy.budget.initialUsd;
    await this.repo.insertState(initial, initial);
    await this.repo.insertLedger({
      entryType: 'seed',
      category: 'initial_budget',
      amountUsd: initial,
      balanceAfterUsd: initial,
      metadata: { source: 'AUTONOMY_INITIAL_BUDGET_USD' },
    });
  }

  async getStatus(): Promise<BudgetStatus> {
    await this.ensureInitialized();
    const [{ rows }, { rows: ledger }, spentToday] = await Promise.all([
      this.repo.getState(),
      this.repo.listLedger(8),
      this.getSpentTodayUsd(),
    ]);
    const state = rows[0];
    const balance = parseFloat(state?.balance_usd ?? '0');
    const minReserve = config.autonomy.budget.minReserveUsd;
    return {
      initialUsd: parseFloat(state?.initial_budget_usd ?? '0'),
      balanceUsd: balance,
      totalSpentUsd: parseFloat(state?.total_spent_usd ?? '0'),
      totalRevenueUsd: parseFloat(state?.total_revenue_usd ?? '0'),
      minReserveUsd: minReserve,
      maxSpendPerTickUsd: config.autonomy.budget.maxSpendPerTickUsd,
      maxSpendPerDayUsd: config.autonomy.budget.maxSpendPerDayUsd,
      spentTodayUsd: spentToday,
      marketingEnabled: config.autonomy.budget.marketingEnabled,
      hardStop: balance <= minReserve,
      recentLedger: ledger as unknown as Array<Record<string, unknown>>,
    };
  }

  async canOperate(): Promise<{ ok: boolean; reason?: string; status: BudgetStatus }> {
    const status = await this.getStatus();
    if (status.hardStop) {
      return { ok: false, reason: 'min_reserve_reached', status };
    }
    if (status.spentTodayUsd >= status.maxSpendPerDayUsd) {
      return { ok: false, reason: 'daily_limit_reached', status };
    }
    return { ok: true, status };
  }

  async spend(
    category: string,
    amountUsd: number,
    tracker: TickSpendTracker,
    opts?: { verticalSlug?: string; metadata?: Record<string, unknown> }
  ): Promise<SpendGuardResult> {
    await this.ensureInitialized();
    const amount = roundUsd(amountUsd);
    if (amount <= 0) {
      return { ok: false, reason: 'invalid_amount', amountUsd: amount };
    }

    const status = await this.getStatus();
    if (status.hardStop) {
      return { ok: false, reason: 'min_reserve_reached', amountUsd: amount };
    }

    const nextTickTotal = tracker.spentUsd + amount;
    if (nextTickTotal > config.autonomy.budget.maxSpendPerTickUsd) {
      return { ok: false, reason: 'tick_limit_exceeded', amountUsd: amount };
    }

    const nextDaily = status.spentTodayUsd + amount;
    if (nextDaily > config.autonomy.budget.maxSpendPerDayUsd) {
      return { ok: false, reason: 'daily_limit_exceeded', amountUsd: amount };
    }

    const balanceAfter = roundUsd(status.balanceUsd - amount);
    if (balanceAfter < config.autonomy.budget.minReserveUsd) {
      return { ok: false, reason: 'would_breach_reserve', amountUsd: amount };
    }

    await this.repo.updateState(balanceAfter, amount, 0);
    await this.repo.insertLedger({
      entryType: 'spend',
      category,
      amountUsd: amount,
      balanceAfterUsd: balanceAfter,
      verticalSlug: opts?.verticalSlug,
      metadata: opts?.metadata,
    });

    tracker.spentUsd = nextTickTotal;
    return { ok: true, amountUsd: amount, balanceAfter };
  }

  async creditTopup(
    amountUsd: number,
    category: string,
    opts?: { metadata?: Record<string, unknown> }
  ): Promise<number> {
    await this.ensureInitialized();
    const amount = roundUsd(amountUsd);
    if (amount <= 0) return 0;

    const { rows } = await this.repo.getState();
    const state = rows[0];
    if (!state) throw new PaymentError('Autonomy budget state missing');

    const balanceAfter = roundUsd(parseFloat(state.balance_usd) + amount);
    await this.repo.updateState(balanceAfter, 0, 0);
    await this.repo.insertLedger({
      entryType: 'topup',
      category,
      amountUsd: amount,
      balanceAfterUsd: balanceAfter,
      metadata: opts?.metadata,
    });
    return balanceAfter;
  }

  async creditRevenue(
    amountUsd: number,
    category: string,
    opts?: { verticalSlug?: string; metadata?: Record<string, unknown> }
  ): Promise<number> {
    await this.ensureInitialized();
    const gross = roundUsd(amountUsd);
    if (gross <= 0) return 0;

    const reinvest = roundUsd(gross * config.autonomy.budget.revenueReinvestRate);
    if (reinvest <= 0) return 0;

    const { rows } = await this.repo.getState();
    const state = rows[0];
    if (!state) throw new PaymentError('Autonomy budget state missing');

    const balanceAfter = roundUsd(parseFloat(state.balance_usd) + reinvest);
    await this.repo.updateState(balanceAfter, 0, reinvest);
    await this.repo.insertLedger({
      entryType: 'revenue',
      category,
      amountUsd: reinvest,
      balanceAfterUsd: balanceAfter,
      verticalSlug: opts?.verticalSlug,
      metadata: { grossUsd: gross, reinvestRate: config.autonomy.budget.revenueReinvestRate, ...(opts?.metadata ?? {}) },
    });
    return reinvest;
  }

  private async getSpentTodayUsd(): Promise<number> {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const { rows } = await this.repo.sumSpentSince(start.toISOString());
    return roundUsd(parseFloat(rows[0]?.total ?? '0'));
  }
}

function roundUsd(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
