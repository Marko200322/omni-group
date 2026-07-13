/** Client-side dynamic pricing — synced with Atina billing/lib/dynamic-pricing.engine.ts */

import { resolveIndustryContext } from './industry-catalog';
import { type PricingTier } from './category-pricing';
import { getCategoryMarketIndex } from './market-pricing';
import {
  getDeliverable,
  type DeliverableBilling,
  type DeliverableDefinition,
  DELIVERABLE_CATALOG,
} from './deliverable-catalog';
import { usesFixedPhasePricing } from './factory-phase';
import { getPackageAnchorEur } from './package-delivery-spec';

export type PaymentProviderId = 'manual' | 'kriptoman' | 'stripe' | 'paypal';

export type QuoteInput = {
  deliverableId: string;
  industryCategory?: string | null;
  verticalSlug?: string | null;
  billingCycle?: DeliverableBilling;
  paymentProvider?: PaymentProviderId;
  tamEstimateUsd?: number | null;
  competitionScore?: number | null;
  marketIntensity?: number | null;
};

export type QuoteBreakdown = {
  deliverableId: string;
  deliverableName: string;
  billing: DeliverableBilling;
  currency: 'EUR';
  anchorEur: number;
  resourceCostEur: number;
  marketValueEur: number;
  marginEur: number;
  subtotalEur: number;
  paymentFeeEur: number;
  paymentProvider: PaymentProviderId;
  clientPriceEur: number;
  clientPriceYearlyEur?: number;
  pricingTier: PricingTier;
  factors: {
    tamFactor: number;
    competitionFactor: number;
    intensityFactor: number;
    tierMultiplier: number;
    categoryMarketIndex: number;
  };
};

const PRICING = {
  eurUsdRate: 0.92,
  targetMarginPct: 35,
  yearlyInfraDiscount: 0.85,
  defaultTamUsd: 50_000,
  competitionDiscountMax: 0.25,
  resourceUnitCosts: {
    aiUsdPer1kTokens: 0.002,
    scraperUsdPerRun: 0.05,
    infraUsdPerHour: 2,
    supportUsdPerHour: 25,
    storageUsdPerGbMonth: 0.1,
  },
  paymentProviders: {
    manual: { feeRate: 0, fixedEur: 0 },
    kriptoman: { feeRate: 0.015, fixedEur: 0 },
    stripe: { feeRate: 0.029, fixedEur: 0.25 },
    paypal: { feeRate: 0.034, fixedEur: 0.35 },
  },
  tierMultipliers: {
    budget: 0.75,
    standard: 1,
    premium: 1.35,
    regulated: 1.65,
    nonprofit: 0.6,
  } as Record<PricingTier, number>,
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function roundPriceEur(n: number) {
  return Math.max(9, Math.round(n));
}

function listDeliverables() {
  return DELIVERABLE_CATALOG;
}

export function computeResourceCostEur(resources: DeliverableDefinition['resources'], billing: DeliverableBilling) {
  const c = PRICING.resourceUnitCosts;
  const complexityMult = 0.8 + resources.deployComplexity * 0.12;
  let usd =
    resources.aiTokensK * c.aiUsdPer1kTokens +
    resources.scraperRuns * c.scraperUsdPerRun +
    resources.infraHours * c.infraUsdPerHour +
    resources.supportHours * c.supportUsdPerHour +
    resources.storageGbMonth * c.storageUsdPerGbMonth;
  usd *= complexityMult;
  if (billing === 'yearly') usd *= 12 * PRICING.yearlyInfraDiscount;
  return roundPriceEur(usd * PRICING.eurUsdRate);
}

function computeMarketValueEur(input: {
  anchorEur: number;
  pricingTier: PricingTier;
  industryCategory?: string | null;
  tamEstimateUsd?: number | null;
  competitionScore?: number | null;
  marketIntensity?: number | null;
}) {
  const tierMultiplier = PRICING.tierMultipliers[input.pricingTier] ?? 1;
  const categoryMarketIndex = getCategoryMarketIndex(input.industryCategory);
  const tam = input.tamEstimateUsd ?? PRICING.defaultTamUsd;
  const tamFactor = clamp(Math.log10(Math.max(tam, 5000) / 10_000) + 1.15, 0.75, 2.2);
  const competition = clamp(input.competitionScore ?? 50, 0, 100);
  const competitionFactor = 1 - (competition / 100) * PRICING.competitionDiscountMax;
  const intensity = clamp(input.marketIntensity ?? 50, 0, 100);
  const intensityFactor = 0.82 + intensity / 250;
  return {
    marketEur:
      input.anchorEur * tierMultiplier * categoryMarketIndex * tamFactor * competitionFactor * intensityFactor,
    factors: { tamFactor, competitionFactor, intensityFactor, tierMultiplier, categoryMarketIndex },
  };
}

function applyPaymentFees(subtotalEur: number, provider: PaymentProviderId) {
  const { feeRate, fixedEur } = PRICING.paymentProviders[provider];
  const clientEur = feeRate > 0 ? (subtotalEur + fixedEur) / (1 - feeRate) : subtotalEur + fixedEur;
  return { feeEur: roundPriceEur(clientEur - subtotalEur), clientEur: roundPriceEur(clientEur) };
}

export function calculateDeliverableQuote(input: QuoteInput): QuoteBreakdown {
  const deliverable = getDeliverable(input.deliverableId);
  if (!deliverable) throw new Error(`Unknown deliverable: ${input.deliverableId}`);

  const billing = input.billingCycle ?? deliverable.billing;
  const ctx = resolveIndustryContext({
    industryCategory: input.industryCategory,
    verticalSlug: input.verticalSlug,
  });
  const pricingTier = ctx.pricingTier;
  const provider = input.paymentProvider ?? 'manual';
  const subtypeIntensityBoost = ctx.vertical ? 1.04 : 1;

  const effectiveAnchor = getPackageAnchorEur(deliverable.id) || deliverable.anchorEur;
  const resourceCostEur = computeResourceCostEur(deliverable.resources, billing);
  const { marketEur, factors } = computeMarketValueEur({
    anchorEur: effectiveAnchor,
    pricingTier,
    industryCategory: input.industryCategory,
    tamEstimateUsd: input.tamEstimateUsd,
    competitionScore: input.competitionScore,
    marketIntensity: input.marketIntensity,
  });

  const marginPct = PRICING.targetMarginPct / 100;
  const costFloor = resourceCostEur * (1 + marginPct);
  const subtotalEur = usesFixedPhasePricing()
    ? roundPriceEur(effectiveAnchor)
    : roundPriceEur(
        Math.max(marketEur, costFloor, effectiveAnchor * factors.tierMultiplier * 0.65) *
          subtypeIntensityBoost,
      );
  const { feeEur, clientEur } = applyPaymentFees(subtotalEur, provider);

  const quote: QuoteBreakdown = {
    deliverableId: deliverable.id,
    deliverableName: deliverable.name,
    billing,
    currency: 'EUR',
    anchorEur: effectiveAnchor,
    resourceCostEur,
    marketValueEur: roundPriceEur(marketEur),
    marginEur: roundPriceEur(Math.max(0, subtotalEur - resourceCostEur)),
    subtotalEur,
    paymentFeeEur: feeEur,
    paymentProvider: provider,
    clientPriceEur: clientEur,
    pricingTier,
    factors,
  };

  if (billing === 'monthly') {
    const yearlyResourceCost = computeResourceCostEur(deliverable.resources, 'yearly');
    const yearlyMarket = computeMarketValueEur({
      anchorEur: effectiveAnchor * 10,
      pricingTier,
      industryCategory: input.industryCategory,
      tamEstimateUsd: input.tamEstimateUsd,
      competitionScore: input.competitionScore,
      marketIntensity: input.marketIntensity,
    });
    const yearlySubtotal = usesFixedPhasePricing()
      ? roundPriceEur(effectiveAnchor * 10)
      : roundPriceEur(
          Math.max(
            yearlyMarket.marketEur,
            yearlyResourceCost * (1 + marginPct),
            effectiveAnchor * 10 * factors.tierMultiplier * 0.6,
          ),
        );
    quote.clientPriceYearlyEur = applyPaymentFees(yearlySubtotal, provider).clientEur;
  }

  return quote;
}

export function quoteAllDeliverables(input: Omit<QuoteInput, 'deliverableId'>) {
  return listDeliverables().map((d) => calculateDeliverableQuote({ ...input, deliverableId: d.id }));
}

export function formatBillingLabel(billing: DeliverableBilling) {
  if (billing === 'one_time') return 'one-time';
  if (billing === 'yearly') return '/ yr';
  return '/ mo';
}
