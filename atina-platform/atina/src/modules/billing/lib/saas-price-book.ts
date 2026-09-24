import type { BillingCycle, PlanSlug } from './category-pricing';

export type BillingCurrency = 'EUR' | 'USD';

type PlanPrice = Record<BillingCycle, Record<BillingCurrency, number>>;

/** Mirror of omnigroup-web/src/lib/saas-plans.ts. Verified by the SaaS readiness gate. */
export const SAAS_PRICE_BOOK: Record<PlanSlug, PlanPrice> = {
  starter: {
    monthly: { EUR: 79, USD: 89 },
    yearly: { EUR: 790, USD: 890 },
  },
  pro: {
    monthly: { EUR: 249, USD: 279 },
    yearly: { EUR: 2490, USD: 2790 },
  },
  enterprise: {
    monthly: { EUR: 429, USD: 469 },
    yearly: { EUR: 4290, USD: 4690 },
  },
};

export function normalizeBillingCurrency(value: unknown): BillingCurrency {
  return String(value ?? '').trim().toUpperCase() === 'USD' ? 'USD' : 'EUR';
}

export function getSaaSPrice(
  planSlug: PlanSlug,
  billingCycle: BillingCycle,
  currency: BillingCurrency,
): number {
  return SAAS_PRICE_BOOK[planSlug][billingCycle][currency];
}

