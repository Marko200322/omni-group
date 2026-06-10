/** Industry-category pricing — synced with atina billing/lib/category-pricing.ts */

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
  starter: { monthly: 49, yearly: 490 },
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
    multiplier: 0.75,
    description: 'Saloni, ugostiteljstvo, retail — niži entry, isti moduli.',
  },
  standard: {
    label: 'Standard',
    labelSr: 'Standard',
    multiplier: 1,
    description: 'Prosečan SMB — referentne cene sa sajta.',
  },
  premium: {
    label: 'Premium',
    labelSr: 'Premium',
    multiplier: 1.35,
    description: 'Finansije, pravo, tech — više compliance i AI kvote.',
  },
  regulated: {
    label: 'Regulated',
    labelSr: 'Regulisane industrije',
    multiplier: 1.65,
    description: 'Zdravstvo, javni sektor, energija — SLA i audit trail.',
  },
  nonprofit: {
    label: 'Nonprofit',
    labelSr: 'NVO / neprofitne',
    multiplier: 0.6,
    description: 'Popust za udruženja, fondacije i humanitarne org.',
  },
};

export const FREELANCE_INDUSTRY_CATEGORIES: IndustryCategoryMeta[] = [
  { slug: 'admin_support', name: 'Admin Support', nameSr: 'Admin podrška', tier: 'budget' },
  { slug: 'ai_data', name: 'AI & Data', nameSr: 'AI & Data', tier: 'premium' },
  { slug: 'audio_music', name: 'Audio & Music', nameSr: 'Audio & muzika', tier: 'standard' },
  { slug: 'business_consulting', name: 'Business & Consulting', nameSr: 'Biznis konsalting', tier: 'premium' },
  { slug: 'community_moderation', name: 'Community & Moderation', nameSr: 'Community & moderacija', tier: 'budget' },
  { slug: 'creator_services', name: 'Creator Services', nameSr: 'Creator usluge', tier: 'standard' },
  { slug: 'customer_service', name: 'Customer Service', nameSr: 'Korisnička podrška', tier: 'budget' },
  { slug: 'design_creative', name: 'Design & Creative', nameSr: 'Dizajn & kreativa', tier: 'standard' },
  { slug: 'development_it', name: 'Development & IT', nameSr: 'Development & IT', tier: 'premium' },
  { slug: 'ecommerce', name: 'E-commerce', nameSr: 'E-commerce', tier: 'standard' },
  { slug: 'education_training', name: 'Education & Training', nameSr: 'Obrazovanje & trening', tier: 'standard' },
  { slug: 'engineering_architecture', name: 'Engineering & Architecture', nameSr: 'Inženjering & arhitektura', tier: 'premium' },
  { slug: 'engineering_science', name: 'Engineering & Science', nameSr: 'Inženjering & nauka', tier: 'premium' },
  { slug: 'finance_accounting', name: 'Finance & Accounting', nameSr: 'Finansije & računovodstvo', tier: 'premium' },
  { slug: 'hr_recruiting', name: 'HR & Recruiting', nameSr: 'HR & regrutacija', tier: 'standard' },
  { slug: 'legal_services', name: 'Legal Services', nameSr: 'Pravne usluge', tier: 'premium' },
  { slug: 'localization', name: 'Localization', nameSr: 'Lokalizacija', tier: 'standard' },
  { slug: 'marketing', name: 'Marketing', nameSr: 'Marketing', tier: 'standard' },
  { slug: 'photography', name: 'Photography', nameSr: 'Fotografija', tier: 'budget' },
  { slug: 'product_project_management', name: 'Product & Project Management', nameSr: 'Proizvod & projekti', tier: 'premium' },
  { slug: 'real_estate_services', name: 'Real Estate Services', nameSr: 'Nekretnine usluge', tier: 'premium' },
  { slug: 'sales', name: 'Sales', nameSr: 'Prodaja', tier: 'standard' },
  { slug: 'video_animation', name: 'Video & Animation', nameSr: 'Video & animacija', tier: 'standard' },
  { slug: 'web3', name: 'Web3', nameSr: 'Web3', tier: 'premium' },
  { slug: 'writing_translation', name: 'Writing & Translation', nameSr: 'Pisanje & prevod', tier: 'budget' },
];

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

export const INDUSTRY_CATEGORIES: IndustryCategoryMeta[] = [
  ...FREELANCE_INDUSTRY_CATEGORIES,
  ...LEGACY_SMB_INDUSTRY_CATEGORIES,
];

const CATEGORY_BY_SLUG = new Map(INDUSTRY_CATEGORIES.map((c) => [c.slug, c]));

export function roundCategoryPrice(amount: number): number {
  return Math.max(9, Math.round(amount));
}

export function getIndustryCategory(slug: string | null | undefined): IndustryCategoryMeta | null {
  if (!slug?.trim()) return null;
  const s = slug.trim().toLowerCase();
  if (CATEGORY_BY_SLUG.has(s)) return CATEGORY_BY_SLUG.get(s)!;
  const underscored = s.replace(/-/g, '_');
  return CATEGORY_BY_SLUG.get(underscored) ?? null;
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
    tierLabel: PRICING_TIER_META[cat.tier].labelSr,
    plans: (['starter', 'pro', 'enterprise'] as PlanSlug[]).map((slug) => ({
      slug,
      monthly: getPlanPriceForCategory(slug, 'monthly', cat.slug),
      yearly: getPlanPriceForCategory(slug, 'yearly', cat.slug),
    })),
  }));
}

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
    return `u paketu od ${formatEur(min)}/mes`;
  }
  const minPlan = PRODUCT_CATALOG_MIN_PLAN[catalogCategoryId] ?? includedIn?.[0] ?? 'pro';
  const price = getPlanPriceForCategory(minPlan, 'monthly', industryCategory);
  if (minPlan === 'enterprise' && catalogCategoryId === 'ai-support') {
    return `od ${formatEur(price)}/mes (Partner)`;
  }
  return `od ${formatEur(price)}/mes`;
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('sr-RS', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const PLAN_SLUG_TO_MARKETING: Record<PlanSlug, string> = {
  starter: 'Poslovni',
  pro: 'Rast',
  enterprise: 'Partner',
};
