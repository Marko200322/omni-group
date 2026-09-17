/**
 * Founding client promo — list prices stay in category-pricing; discount is checkout overlay.
 * Enable with NEXT_PUBLIC_FOUNDING_CLIENT_PROMO=true (max 50 slots tracked in ops).
 */
import {
  getPlanPriceForCategory,
  resolvePricingTier,
  type PlanSlug,
  type PricingTier,
} from './category-pricing';

const PROMO_ENABLED =
  (process.env.NEXT_PUBLIC_FOUNDING_CLIENT_PROMO ?? '').trim().toLowerCase() === 'true';

const DISCOUNT_PCT = Math.min(
  50,
  Math.max(0, Number(process.env.NEXT_PUBLIC_FOUNDING_CLIENT_DISCOUNT_PCT ?? '15') || 15),
);

const MAX_SLOTS = Math.max(
  1,
  Number(process.env.NEXT_PUBLIC_FOUNDING_CLIENT_MAX_SLOTS ?? '50') || 50,
);

const LOCK_MONTHS = Math.max(
  1,
  Number(process.env.NEXT_PUBLIC_FOUNDING_CLIENT_LOCK_MONTHS ?? '12') || 12,
);

export function isFoundingClientPromoEnabled(): boolean {
  return PROMO_ENABLED;
}

export function getFoundingClientMaxSlots(): number {
  return MAX_SLOTS;
}

export function getFoundingClientLockMonths(): number {
  return LOCK_MONTHS;
}

export function getFoundingClientDiscountPct(): number {
  return DISCOUNT_PCT;
}

export function foundingClientPromoEligible(tier: PricingTier): boolean {
  return tier !== 'regulated';
}

export type FoundingClientPriceQuote = {
  listEur: number;
  foundingEur: number;
  active: boolean;
  discountPct: number;
  label: string;
};

export function applyFoundingClientPrice(
  listEur: number,
  tier: PricingTier,
): FoundingClientPriceQuote {
  if (!PROMO_ENABLED || !foundingClientPromoEligible(tier)) {
    return {
      listEur,
      foundingEur: listEur,
      active: false,
      discountPct: 0,
      label: '',
    };
  }
  const foundingEur = Math.max(9, Math.round(listEur * (1 - DISCOUNT_PCT / 100)));
  return {
    listEur,
    foundingEur,
    active: true,
    discountPct: DISCOUNT_PCT,
    label: `Founding client — ${DISCOUNT_PCT}% off list (locked ${LOCK_MONTHS} mo, ${MAX_SLOTS} slots)`,
  };
}

export function getFoundingClientPlanQuote(
  planSlug: PlanSlug,
  industryCategory?: string | null,
): FoundingClientPriceQuote {
  const tier = resolvePricingTier(industryCategory);
  const listEur = getPlanPriceForCategory(planSlug, 'monthly', industryCategory);
  return applyFoundingClientPrice(listEur, tier);
}
