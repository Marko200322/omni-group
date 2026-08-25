/**
 * Packages recommended for current budget — see package-delivery-spec.ts
 */
export {
  BUDGET_LAUNCH_PACKAGE_IDS,
  canCheckoutPackage,
  listCheckoutPackages,
} from './package-delivery-spec';
export { getMonthlyBudgetEur, isBudgetLaunchMode, getBudgetAllocationHint } from './prod-budget';

import { getMonthlyBudgetEur } from './prod-budget';
import { getFactoryPhase } from './factory-phase';
import { listCheckoutPackages } from './package-delivery-spec';

export function getSellablePackageIds(): string[] {
  return listCheckoutPackages();
}

export function isSellablePackage(deliverableId: string): boolean {
  return getSellablePackageIds().includes(deliverableId);
}

export function getSellablePackageHint(): string {
  const budget = getMonthlyBudgetEur();
  const phase = getFactoryPhase();
  const ids = listCheckoutPackages();
  if (ids.length === 0) {
    return `Factory ${phase}: no self-serve packages open — revenue depends on contact quotes.`;
  }
  if (budget <= 250) {
    return `Factory ${phase} · ${ids.length} packages on checkout. Recommended first sale: Quick setup, Audit, Landing, Website, Workflow, Support.`;
  }
  return `Factory ${phase}: ${ids.length} catalog packages open for checkout.`;
}
