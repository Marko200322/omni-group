/** Sync with atina-platform/atina/src/modules/billing/lib/competitive-catalog-pricing.ts */
import type { DeliverableDefinition } from './deliverable-catalog';
import { getIndustryCategory, type PricingTier } from './category-pricing';
import { getCategoryMarketIndex } from './market-pricing';

const TIER_COMPETITIVE: Record<PricingTier, number> = {
  budget: 0.86,
  standard: 0.96,
  premium: 1.04,
  regulated: 1.1,
  nonprofit: 0.72,
};

const DELIVERABLE_COMPETITIVE: Partial<Record<string, number>> = {
  'setup-quick': 0.98,
  audit: 0.97,
  'workflow-design': 0.98,
  landing: 0.96,
  'support-priority': 0.94,
  'vertical-package': 0.95,
  'lead-gen-retainer': 0.97,
  'website-business': 1.0,
  'website-ecommerce': 1.02,
  'setup-full': 1.0,
  'setup-custom': 1.05,
  integration: 1.03,
  'support-dedicated': 1.02,
  'white-label-setup': 0.98,
  'sales-enablement': 0.97,
  'ai-support-retainer': 0.96,
  'custom-software': 1.08,
  'bundle-portal-presence': 0.93,
  'bundle-sales-launch': 0.94,
  'bundle-ops-clarity': 0.95,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function getDeliverableCompetitiveFactor(deliverableId: string): number {
  return DELIVERABLE_COMPETITIVE[deliverableId] ?? 1;
}

export function getIndustryCompetitiveFactor(
  industryCategory: string | null | undefined,
  pricingTier: PricingTier,
): number {
  const marketIdx = getCategoryMarketIndex(industryCategory);
  const marketBlend = clamp(0.65 + marketIdx * 0.35, 0.72, 1.38);
  const cat = industryCategory ? getIndustryCategory(industryCategory) : null;
  const tier = cat?.tier ?? pricingTier;
  const tierAdj = TIER_COMPETITIVE[tier] ?? 1;
  return clamp(tierAdj * 0.55 + marketBlend * 0.45, 0.68, 1.22);
}

export function roundQuoteEur(amount: number): number {
  return Math.max(9, Math.round(amount));
}

export function computeCompetitiveClientSubtotal(params: {
  effectiveAnchorEur: number;
  deliverableId: string;
  industryCategory?: string | null;
  pricingTier: PricingTier;
}): { subtotalEur: number; industryFactor: number; skuFactor: number } {
  const skuFactor = getDeliverableCompetitiveFactor(params.deliverableId);
  const industryFactor = getIndustryCompetitiveFactor(params.industryCategory, params.pricingTier);
  const subtotalEur = roundQuoteEur(params.effectiveAnchorEur * industryFactor * skuFactor);
  return { subtotalEur, industryFactor, skuFactor };
}

export function competitiveFactorForDeliverable(
  d: DeliverableDefinition,
  industryCategory?: string | null,
  pricingTier: PricingTier = 'standard',
): number {
  return (
    getIndustryCompetitiveFactor(industryCategory, pricingTier) *
    getDeliverableCompetitiveFactor(d.id)
  );
}
