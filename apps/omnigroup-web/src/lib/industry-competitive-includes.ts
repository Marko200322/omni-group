/** Sync with atina-platform/atina/src/modules/billing/lib/industry-competitive-includes.ts */
import { getIndustryCategory, type PricingTier } from './category-pricing';

const TIER_BONUS: Record<PricingTier, string[]> = {
  budget: ['Extra competitor price snapshot for your niche (PDF add-on)'],
  standard: ['Industry outreach hook sheet (1 page)'],
  premium: ['Competitor positioning notes for your segment'],
  regulated: ['Compliance-aware delivery checklist for your sector'],
  nonprofit: ['Grant-friendly scope summary page'],
};

const RECOMMENDED_BONUS = 'Marked as top pick for your industry in the catalog';

const BUNDLE_BONUS: Record<string, string> = {
  'bundle-portal-presence': 'Single checkout — portal + live landing (vs buying separately)',
  'bundle-sales-launch': 'Live page + sales scripts aligned to your niche',
  'bundle-ops-clarity': 'Audit + workflow plan in one delivery timeline',
};

export function getIndustryCompetitiveBonusIncludes(
  industryCategory: string | null | undefined,
  deliverableId: string,
  recommendedForIndustry?: boolean,
): string[] {
  const out: string[] = [];
  const bundle = BUNDLE_BONUS[deliverableId];
  if (bundle) out.push(bundle);
  if (!industryCategory?.trim()) return out;
  const cat = getIndustryCategory(industryCategory);
  if (!cat) return out;
  out.push(...(TIER_BONUS[cat.tier] ?? TIER_BONUS.standard).slice(0, 1));
  if (recommendedForIndustry) out.push(RECOMMENDED_BONUS);
  return Array.from(new Set(out));
}
