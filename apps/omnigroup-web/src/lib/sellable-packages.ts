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
  if (budget <= 250) {
    return `Factory ${phase} · €${budget}/mo: Setup Quick €249, Audit €349, Landing €549, Website €990, Workflow €449, Support €99/mo.`;
  }
  return `Factory ${phase}: checkout packages match current system capabilities.`;
}
