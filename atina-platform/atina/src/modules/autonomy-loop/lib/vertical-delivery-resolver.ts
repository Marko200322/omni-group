import { calculateDeliverableQuote } from '../../billing/lib/dynamic-pricing.engine';
import { getDeliverable, type DeliverableBilling } from '../../billing/lib/deliverable-catalog';
import { resolveVerticalSlug } from '../../../shared/industry/industry-catalog';
import {
  getCategoryDeliveryProfile,
  type CategoryDeliveryProfile,
  type WorkflowStepDef,
} from './vertical-delivery-profiles';

export type DeliverableQuoteSummary = {
  id: string;
  name: string;
  nameSr: string;
  clientPriceEur: number;
  billing: DeliverableBilling;
};

export type VerticalDeliveryPack = {
  verticalSlug: string;
  category: string;
  subtype: string | null;
  displayName: string;
  categoryProfile: CategoryDeliveryProfile;
  keywords: string[];
  valueProp: string;
  outreachHooks: string[];
  researchFocus: string[];
  qualityGates: string[];
  coreModules: string[];
  workflowSteps: WorkflowStepDef[];
  recommendedDeliverables: DeliverableQuoteSummary[];
  verticalPackageQuoteEur: number;
  marketIntensityDefault: number;
};

function humanizeSubtype(subtype: string): string {
  return subtype
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function resolveVerticalDeliveryPack(input: {
  slug: string;
  category: string;
  subtype?: string | null;
  name: string;
  researchData?: Record<string, unknown> | null;
}): VerticalDeliveryPack {
  const resolved = resolveVerticalSlug(input.slug);
  const category = resolved?.category ?? input.category;
  const subtype = resolved?.subtype ?? input.subtype ?? null;
  const profile = getCategoryDeliveryProfile(category);
  const nicheLabel = subtype ? humanizeSubtype(subtype) : input.name.split('(')[0]?.trim() || input.name;

  const research = input.researchData ?? {};
  const researchKeywords = Array.isArray(research.keywords)
    ? (research.keywords as string[])
    : [];
  const keywords = [
    ...new Set([
      ...profile.baseKeywords,
      nicheLabel.toLowerCase(),
      category.replace(/_/g, ' '),
      ...researchKeywords,
    ]),
  ].slice(0, 12);

  const valueProp =
    typeof research.value_proposition === 'string' && research.value_proposition.trim()
      ? research.value_proposition
      : profile.valuePropTemplate.replace(/\{niche\}/g, nicheLabel);

  const tamEstimateUsd =
    typeof research.tam_estimate_usd === 'number' ? research.tam_estimate_usd : undefined;
  const competitionScore =
    typeof research.competition_score === 'number' ? research.competition_score : undefined;

  const recommendedDeliverables = profile.primaryDeliverables
    .map((id) => {
      const def = getDeliverable(id);
      if (!def) return null;
      const quote = calculateDeliverableQuote({
        deliverableId: id,
        industryCategory: category,
        verticalSlug: input.slug,
        billingCycle: def.billing,
        paymentProvider: 'manual',
        marketIntensity: profile.marketIntensityDefault,
        tamEstimateUsd,
        competitionScore,
      });
      return {
        id,
        name: def.name,
        nameSr: def.nameSr,
        clientPriceEur: quote.clientPriceEur,
        billing: def.billing,
      };
    })
    .filter((x): x is DeliverableQuoteSummary => x !== null);

  const verticalPackageQuote = calculateDeliverableQuote({
    deliverableId: 'vertical-package',
    industryCategory: category,
    verticalSlug: input.slug,
    billingCycle: 'monthly',
    paymentProvider: 'manual',
    marketIntensity: profile.marketIntensityDefault,
    tamEstimateUsd,
    competitionScore,
  });

  return {
    verticalSlug: input.slug,
    category,
    subtype,
    displayName: input.name,
    categoryProfile: profile,
    keywords,
    valueProp,
    outreachHooks: profile.outreachHooks,
    researchFocus: profile.researchFocus,
    qualityGates: profile.qualityGates,
    coreModules: profile.coreModules,
    workflowSteps: profile.workflowSteps.map((s) => ({
      ...s,
      config: { ...s.config, vertical: input.slug, category },
    })),
    recommendedDeliverables,
    verticalPackageQuoteEur: verticalPackageQuote.clientPriceEur,
    marketIntensityDefault: profile.marketIntensityDefault,
  };
}
