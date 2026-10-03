import { applyBps, assertCents, subCents } from './money';

export type RoiScenarioLabel = 'ESTIMATE' | 'FORECAST' | 'SCENARIO';

export type RoiScenario = {
  name: 'conservative' | 'base' | 'upside';
  label: RoiScenarioLabel;
  monthlyRevenueCents: number;
  monthlyCostCents: number;
  monthlyVariableCents: number;
  contributionCents: number;
  paybackMonths: number | null;
  /** Always false — scenarios are non-guaranteed. */
  guaranteed: false;
  kind: 'non_guaranteed';
};

export type RoiScenariosInput = {
  initialCostCents: number;
  monthlyCostCents: number;
  monthlyRevenueCents: number;
  monthlyVariableCents: number;
};

export type RoiScenariosResult = {
  conservative: RoiScenario;
  base: RoiScenario;
  upside: RoiScenario;
  disclaimer: 'All ROI figures are non-guaranteed ESTIMATE/FORECAST/SCENARIO values.';
};

function paybackMonths(initialCostCents: number, contributionCents: number): number | null {
  if (contributionCents <= 0) return null;
  return initialCostCents / contributionCents;
}

function buildScenario(
  name: RoiScenario['name'],
  label: RoiScenarioLabel,
  initialCostCents: number,
  monthlyRevenueCents: number,
  monthlyCostCents: number,
  monthlyVariableCents: number,
): RoiScenario {
  const contributionCents = subCents(
    monthlyRevenueCents,
    addCosts(monthlyCostCents, monthlyVariableCents),
  );
  return {
    name,
    label,
    monthlyRevenueCents,
    monthlyCostCents,
    monthlyVariableCents,
    contributionCents,
    paybackMonths: paybackMonths(initialCostCents, contributionCents),
    guaranteed: false,
    kind: 'non_guaranteed',
  };
}

function addCosts(a: number, b: number): number {
  return assertCents(a) + assertCents(b);
}

/**
 * Build conservative / base / upside ROI scenarios.
 * Conservative: −20% revenue, +10% costs. Upside: +20% revenue, −10% variable.
 * All marked non-guaranteed.
 */
export function computeRoiScenarios(input: RoiScenariosInput): RoiScenariosResult {
  assertCents(input.initialCostCents, 'initialCostCents');
  assertCents(input.monthlyCostCents, 'monthlyCostCents');
  assertCents(input.monthlyRevenueCents, 'monthlyRevenueCents');
  assertCents(input.monthlyVariableCents, 'monthlyVariableCents');

  const baseRev = input.monthlyRevenueCents;
  const baseCost = input.monthlyCostCents;
  const baseVar = input.monthlyVariableCents;

  const consRev = applyBps(baseRev, 8000);
  const consCost = applyBps(baseCost, 11_000);
  const consVar = applyBps(baseVar, 11_000);

  const upRev = applyBps(baseRev, 12_000);
  const upCost = baseCost;
  const upVar = applyBps(baseVar, 9000);

  return {
    conservative: buildScenario(
      'conservative',
      'ESTIMATE',
      input.initialCostCents,
      consRev,
      consCost,
      consVar,
    ),
    base: buildScenario('base', 'FORECAST', input.initialCostCents, baseRev, baseCost, baseVar),
    upside: buildScenario('upside', 'SCENARIO', input.initialCostCents, upRev, upCost, upVar),
    disclaimer: 'All ROI figures are non-guaranteed ESTIMATE/FORECAST/SCENARIO values.',
  };
}
