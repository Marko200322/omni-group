import type { OperatingMode } from './constants';
import { assertCents } from './money';
import { computeRunwayMonths } from './runway';

export type RevenueTrend = 'up' | 'flat' | 'down' | 'volatile';

export type DeriveOperatingModeInput = {
  cashCents: number;
  monthlyNetCents: number;
  revenueTrend: RevenueTrend;
  /** Optional override for capital preservation threshold. Default 3 months. */
  minRunwayMonths?: number;
  /** Optional emergency cash floor in cents. Default 50_000_00 (€50k display-scale optional). */
  emergencyCashFloorCents?: number;
};

/**
 * Derive operating mode from cash, runway, and revenue trend.
 * Order: emergency → capital_preservation → conservation → growth → normal.
 */
export function deriveOperatingMode(input: DeriveOperatingModeInput): OperatingMode {
  assertCents(input.cashCents, 'cashCents');
  assertCents(input.monthlyNetCents, 'monthlyNetCents');

  const minRunway = input.minRunwayMonths ?? 3;
  const emergencyFloor = input.emergencyCashFloorCents ?? 500_000; // €5,000 default floor
  assertCents(emergencyFloor, 'emergencyCashFloorCents');

  const { runwayMonths, infinite } = computeRunwayMonths(input.cashCents, input.monthlyNetCents);
  const cash = Math.max(0, input.cashCents);

  if (cash < emergencyFloor || (!infinite && runwayMonths < 1)) {
    return 'emergency';
  }

  if (!infinite && runwayMonths < minRunway) {
    return 'capital_preservation';
  }

  if (input.revenueTrend === 'down' || input.revenueTrend === 'volatile') {
    return 'conservation';
  }

  if (input.revenueTrend === 'up' && (infinite || runwayMonths >= minRunway * 2)) {
    return 'growth';
  }

  return 'normal';
}
