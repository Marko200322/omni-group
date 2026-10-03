import { assertCents } from './money';

export type SimulateBusinessMonthsParams = {
  startingCashCents: number;
  startingReserveCents: number;
  reserveFloorCents: number;
  baseMonthlyRevenueCents: number;
  baseMonthlyExpenseCents: number;
  /** Month index (1–12) for a large unexpected cost. Default 6. */
  shockMonth?: number;
  /** Extra one-time cost in shock month. Default 25% of base expenses. */
  unexpectedCostCents?: number;
  /** Month index (1–12) when revenue drops. Default 9. */
  revenueDropMonth?: number;
  /** Revenue multiplier in bps for drop month onward (e.g. 7000 = 70%). Default 7000. */
  revenueDropBps?: number;
  /** Optional monthly revenue shock bps series length 12. Positive = uplift. */
  monthlyRevenueShockBps?: number[];
  /** Optional monthly expense shock bps series length 12. Positive = higher expense. */
  monthlyExpenseShockBps?: number[];
};

export type SimulatedMonth = {
  month: number;
  revenueCents: number;
  expenseCents: number;
  netCents: number;
  cashCents: number;
  reserveCents: number;
  reserveBreached: boolean;
};

export type SimulateBusinessMonthsResult = {
  months: SimulatedMonth[];
  reserveBreaches: number[];
  endingCashCents: number;
  endingReserveCents: number;
};

function applyBpsInt(amount: number, bps: number): number {
  const product = BigInt(amount) * BigInt(bps);
  const denom = 10_000n;
  const half = denom / 2n;
  const sign = product < 0n ? -1n : 1n;
  const abs = product < 0n ? -product : product;
  return Number((sign * (abs + half)) / denom);
}

/**
 * Pure 12-month dry-run simulation with revenue/expense shocks,
 * a large unexpected cost month, and a revenue drop window.
 */
export function simulateBusinessMonths(
  params: SimulateBusinessMonthsParams,
): SimulateBusinessMonthsResult {
  assertCents(params.startingCashCents, 'startingCashCents');
  assertCents(params.startingReserveCents, 'startingReserveCents');
  assertCents(params.reserveFloorCents, 'reserveFloorCents');
  assertCents(params.baseMonthlyRevenueCents, 'baseMonthlyRevenueCents');
  assertCents(params.baseMonthlyExpenseCents, 'baseMonthlyExpenseCents');

  const shockMonth = params.shockMonth ?? 6;
  const revenueDropMonth = params.revenueDropMonth ?? 9;
  const revenueDropBps = params.revenueDropBps ?? 7000;
  const unexpectedCostCents =
    params.unexpectedCostCents ?? applyBpsInt(params.baseMonthlyExpenseCents, 2500);

  if (params.unexpectedCostCents != null) {
    assertCents(params.unexpectedCostCents, 'unexpectedCostCents');
  }

  let cash = params.startingCashCents;
  let reserve = params.startingReserveCents;
  const months: SimulatedMonth[] = [];
  const reserveBreaches: number[] = [];

  for (let month = 1; month <= 12; month++) {
    const revShock = params.monthlyRevenueShockBps?.[month - 1] ?? 0;
    const expShock = params.monthlyExpenseShockBps?.[month - 1] ?? 0;

    let revenueBps = 10_000 + revShock;
    if (month >= revenueDropMonth) {
      revenueBps = applyBpsInt(revenueBps, revenueDropBps);
    }
    const expenseBps = 10_000 + expShock;

    let revenueCents = applyBpsInt(params.baseMonthlyRevenueCents, revenueBps);
    let expenseCents = applyBpsInt(params.baseMonthlyExpenseCents, expenseBps);

    if (month === shockMonth) {
      expenseCents += unexpectedCostCents;
    }

    const netCents = revenueCents - expenseCents;
    cash += netCents;

    // Stress-test reserve: surplus tops up; deficit draws even if it breaches the floor.
    if (netCents > 0) {
      const toReserve = applyBpsInt(netCents, 2000);
      reserve += toReserve;
      cash -= toReserve;
    } else if (netCents < 0) {
      const need = -netCents;
      const draw = Math.min(Math.max(0, reserve), need);
      reserve -= draw;
      cash += draw;
    }

    const reserveBreached = reserve < params.reserveFloorCents;
    if (reserveBreached) reserveBreaches.push(month);

    months.push({
      month,
      revenueCents,
      expenseCents,
      netCents,
      cashCents: cash,
      reserveCents: reserve,
      reserveBreached,
    });
  }

  return {
    months,
    reserveBreaches,
    endingCashCents: cash,
    endingReserveCents: reserve,
  };
}
