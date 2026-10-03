import { assertCents } from './money';

export type RunwayResult = {
  runwayMonths: number;
  infinite: boolean;
  cashCents: number;
  monthlyNetCents: number;
};

/**
 * Months of runway from cash and monthly net cashflow (integer cents).
 * Positive or zero monthly net → infinite runway (reported as Number.POSITIVE_INFINITY).
 */
export function computeRunwayMonths(cashCents: number, monthlyNetCents: number): RunwayResult {
  assertCents(cashCents, 'cashCents');
  assertCents(monthlyNetCents, 'monthlyNetCents');

  const cash = Math.max(0, cashCents);

  if (monthlyNetCents >= 0) {
    return {
      runwayMonths: Number.POSITIVE_INFINITY,
      infinite: true,
      cashCents: cash,
      monthlyNetCents,
    };
  }

  const burn = -monthlyNetCents;
  // Integer months floor; fractional month via integer cents ratio for display callers.
  const months = cash / burn;
  return {
    runwayMonths: months,
    infinite: false,
    cashCents: cash,
    monthlyNetCents,
  };
}

export type CapitalPreservationCheck = {
  required: boolean;
  runwayMonths: number;
  minRunwayMonths: number;
  reason: string;
};

export function checkCapitalPreservation(
  cashCents: number,
  monthlyNetCents: number,
  minRunwayMonths: number,
): CapitalPreservationCheck {
  if (!(minRunwayMonths > 0) || !Number.isFinite(minRunwayMonths)) {
    throw new Error('minRunwayMonths must be a positive finite number');
  }
  const { runwayMonths, infinite } = computeRunwayMonths(cashCents, monthlyNetCents);
  if (infinite) {
    return {
      required: false,
      runwayMonths,
      minRunwayMonths,
      reason: 'runway_infinite_cashflow_non_negative',
    };
  }
  const required = runwayMonths < minRunwayMonths;
  return {
    required,
    runwayMonths,
    minRunwayMonths,
    reason: required ? 'runway_below_minimum' : 'runway_meets_minimum',
  };
}
