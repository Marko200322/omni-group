/** Industry-category pricing — base plans × tier multiplier (aligned with omnigroup-web). */

import { FREELANCE_PLATFORM_CATEGORY_META } from '../../autonomy-loop/data/freelance-platform-taxonomy';
import { getCategoryMarketIndex } from './market-pricing';

export type PlanSlug = 'starter' | 'pro' | 'enterprise';
export type BillingCycle = 'monthly' | 'yearly';
export type PricingTier = 'budget' | 'standard' | 'premium' | 'regulated' | 'nonprofit';

export type IndustryCategoryMeta = {
  slug: string;
  name: string;
  nameSr: string;
  tier: PricingTier;
  note?: string;
};

export const BASE_PLAN_PRICES: Record<PlanSlug, { monthly: number; yearly: number }> = {
  starter: { monthly: 39, yearly: 390 },
  pro: { monthly: 129, yearly: 1290 },
  enterprise: { monthly: 299, yearly: 2990 },
};

export const PRICING_TIER_META: Record<
  PricingTier,
  { label: string; labelSr: string; multiplier: number; description: string }
> = {
  budget: {
    label: 'Budget SMB',
    labelSr: 'Mali biznis',
    multiplier: 0.7,
    description: 'Salons, hospitality, retail — lower entry, same modules.',
  },
  standard: {
    label: 'Standard',
    labelSr: 'Standard',
    multiplier: 0.92,
    description: 'Typical SMB — reference prices from the site.',
  },
  premium: {
    label: 'Premium',
    labelSr: 'Premium',
    multiplier: 1.22,
    description: 'Finance, legal, tech — more compliance and AI quota.',
  },
  regulated: {
    label: 'Regulated',
    labelSr: 'Regulisane industrije',
    multiplier: 1.5,
    description: 'Healthcare, public sector, energy — SLA and audit trail.',
  },
  nonprofit: {
    label: 'Nonprofit',
    labelSr: 'NVO / neprofitne',
    multiplier: 0.58,
    description: 'Discount for associations, foundations, and humanitarian orgs.',
  },
};

/** Freelance platform (25) — primarni katalog isporuka. */
export const FREELANCE_INDUSTRY_CATEGORIES: IndustryCategoryMeta[] =
  FREELANCE_PLATFORM_CATEGORY_META.map((c) => ({
    slug: c.slug,
    name: c.name,
    nameSr: c.nameSr,
    tier: c.tier,
  }));

/** Legacy SMB vertikale (25) — postojeći autonomy seed. */
export const LEGACY_SMB_INDUSTRY_CATEGORIES: IndustryCategoryMeta[] = [
  { slug: 'healthcare', name: 'Healthcare', nameSr: 'Zdravstvo', tier: 'regulated' },
  { slug: 'legal', name: 'Legal', nameSr: 'Pravo', tier: 'premium' },
  { slug: 'retail', name: 'Retail', nameSr: 'Maloprodaja', tier: 'budget' },
  { slug: 'hospitality', name: 'Hospitality', nameSr: 'Ugostiteljstvo', tier: 'budget' },
  { slug: 'construction', name: 'Construction', nameSr: 'Građevina', tier: 'standard' },
  { slug: 'education', name: 'Education', nameSr: 'Obrazovanje', tier: 'standard' },
  { slug: 'finance', name: 'Finance', nameSr: 'Finansije', tier: 'premium' },
  { slug: 'logistics', name: 'Logistics', nameSr: 'Logistika', tier: 'premium' },
  { slug: 'beauty', name: 'Beauty', nameSr: 'Lepota i wellness', tier: 'budget' },
  { slug: 'fitness', name: 'Fitness', nameSr: 'Fitnes', tier: 'budget' },
  { slug: 'agriculture', name: 'Agriculture', nameSr: 'Poljoprivreda', tier: 'standard' },
  { slug: 'automotive', name: 'Automotive', nameSr: 'Automobili', tier: 'standard' },
  { slug: 'real-estate', name: 'Real estate', nameSr: 'Nekretnine', tier: 'premium' },
  { slug: 'manufacturing', name: 'Manufacturing', nameSr: 'Proizvodnja', tier: 'premium' },
  { slug: 'technology', name: 'Technology', nameSr: 'Tehnologija', tier: 'premium' },
  { slug: 'media', name: 'Media', nameSr: 'Mediji', tier: 'standard' },
  { slug: 'nonprofit', name: 'Nonprofit', nameSr: 'Neprofitne org.', tier: 'nonprofit' },
  { slug: 'government', name: 'Government', nameSr: 'Javni sektor', tier: 'regulated' },
  { slug: 'energy', name: 'Energy', nameSr: 'Energija', tier: 'regulated' },
  { slug: 'travel', name: 'Travel', nameSr: 'Putovanja', tier: 'standard' },
  { slug: 'professional', name: 'Professional services', nameSr: 'Profesionalne usluge', tier: 'standard' },
  { slug: 'entertainment', name: 'Entertainment', nameSr: 'Zabava', tier: 'standard' },
  { slug: 'home_services', name: 'Home services', nameSr: 'Kućne usluge', tier: 'budget' },
  { slug: 'pets', name: 'Pets', nameSr: 'Pet industrija', tier: 'budget' },
  { slug: 'industrial', name: 'Industrial', nameSr: 'Industrija', tier: 'regulated' },
];

/** Freelance + legacy — pun katalog za pricing i UI. */
export const INDUSTRY_CATEGORIES: IndustryCategoryMeta[] = [
  ...FREELANCE_INDUSTRY_CATEGORIES,
  ...LEGACY_SMB_INDUSTRY_CATEGORIES,
];

const CATEGORY_BY_SLUG = new Map(INDUSTRY_CATEGORIES.map((c) => [c.slug, c]));

export function roundCategoryPrice(amount: number): number {
  return Math.max(9, Math.round(amount));
}

function normalizeCategoryKey(slug: string): string {
  const s = slug.trim().toLowerCase();
  if (CATEGORY_BY_SLUG.has(s)) return s;
  const underscored = s.replace(/-/g, '_');
  if (CATEGORY_BY_SLUG.has(underscored)) return underscored;
  return s;
}

export function getIndustryCategory(slug: string | null | undefined): IndustryCategoryMeta | null {
  if (!slug?.trim()) return null;
  return CATEGORY_BY_SLUG.get(normalizeCategoryKey(slug)) ?? null;
}

export function resolvePricingTier(industryCategory?: string | null): PricingTier {
  return getIndustryCategory(industryCategory)?.tier ?? 'standard';
}

export function getPlanPriceForCategory(
  planSlug: PlanSlug,
  billingCycle: BillingCycle,
  industryCategory?: string | null,
): number {
  const base = BASE_PLAN_PRICES[planSlug];
  const tier = resolvePricingTier(industryCategory);
  const multiplier = PRICING_TIER_META[tier].multiplier;
  const marketIndex = getCategoryMarketIndex(industryCategory);
  const raw =
    (billingCycle === 'yearly' ? base.yearly * multiplier : base.monthly * multiplier) * marketIndex;
  return roundCategoryPrice(raw);
}

export function getCategoryPricingMatrix() {
  return INDUSTRY_CATEGORIES.map((cat) => ({
    ...cat,
    tierLabel: PRICING_TIER_META[cat.tier].label,
    plans: (['starter', 'pro', 'enterprise'] as PlanSlug[]).map((slug) => ({
      slug,
      monthly: getPlanPriceForCategory(slug, 'monthly', cat.slug),
      yearly: getPlanPriceForCategory(slug, 'yearly', cat.slug),
    })),
  }));
}

export function listPricingTiers() {
  return (Object.keys(PRICING_TIER_META) as PricingTier[]).map((tier) => ({
    tier,
    ...PRICING_TIER_META[tier],
    plans: (['starter', 'pro', 'enterprise'] as PlanSlug[]).map((slug) => ({
      slug,
      monthly: getPlanPriceForCategory(slug, 'monthly', tier === 'standard' ? null : findFirstCategoryForTier(tier)),
      yearly: getPlanPriceForCategory(slug, 'yearly', tier === 'standard' ? null : findFirstCategoryForTier(tier)),
    })),
  }));
}

function findFirstCategoryForTier(tier: PricingTier): string {
  return INDUSTRY_CATEGORIES.find((c) => c.tier === tier)?.slug ?? 'professional';
}

/** Minimum plan monthly price for a product catalog group (module bundle). */
export const PRODUCT_CATALOG_MIN_PLAN: Record<string, PlanSlug> = {
  platform: 'starter',
  'sales-crm': 'pro',
  automation: 'pro',
  'ai-support': 'pro',
  enterprise: 'enterprise',
};

export function getModulePriceLabel(
  catalogCategoryId: string,
  industryCategory?: string | null,
  includedIn?: PlanSlug[],
): string {
  if (includedIn?.length === 3) {
    const min = getPlanPriceForCategory('starter', 'monthly', industryCategory);
    return `in bundle from €${min}/mo`;
  }
  const minPlan = PRODUCT_CATALOG_MIN_PLAN[catalogCategoryId] ?? includedIn?.[0] ?? 'pro';
  const price = getPlanPriceForCategory(minPlan, 'monthly', industryCategory);
  return `from €${price}/mo`;
}
