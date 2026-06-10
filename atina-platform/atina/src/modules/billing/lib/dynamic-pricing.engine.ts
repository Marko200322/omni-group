/**
 * Dynamic deliverable pricing: market value + resource consumption + payment provider fees.
 * Platform access is NOT sold — only outputs (deliverables).
 */

import { config } from '../../../config';
import { resolveIndustryContext } from '../../../shared/industry/industry-catalog';
import { type PricingTier } from './category-pricing';
import { getDeliverable, listDeliverables, type DeliverableBilling, type DeliverableDefinition } from './deliverable-catalog';
import { getCategoryMarketIndex } from './market-pricing';

export type PaymentProviderId = 'manual' | 'kriptoman' | 'stripe' | 'paypal';

export type QuoteInput = {
  deliverableId: string;
  industryCategory?: string | null;
  /** Pod-industrija (npr. healthcare-dental) — preciznija isporuka i pricing kontekst. */
  verticalSlug?: string | null;
  billingCycle?: DeliverableBilling;
  paymentProvider?: PaymentProviderId;
  /** Market research signals (from autonomy vertical research). */
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
  industryCategory: string | null;
  verticalSlug: string | null;
  verticalName: string | null;
  factors: {
    tamFactor: number;
    competitionFactor: number;
    intensityFactor: number;
    tierMultiplier: number;
    categoryMarketIndex: number;
  };
  resources: DeliverableDefinition['resources'];
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundPriceEur(n: number): number {
  return Math.max(9, Math.round(n));
}

function getPricingConfig() {
  return config.pricing;
}

function getProviderFees(provider: PaymentProviderId) {
  const p = getPricingConfig().paymentProviders[provider];
  return { feeRate: p.feeRate, fixedEur: p.fixedEur };
}

/** Resource burn → EUR cost (includes deploy complexity). */
export function computeResourceCostEur(
  resources: DeliverableDefinition['resources'],
  billing: DeliverableBilling,
): number {
  const c = getPricingConfig().resourceUnitCosts;
  const eurUsd = getPricingConfig().eurUsdRate;
  const complexityMult = 0.8 + resources.deployComplexity * 0.12;

  let usd =
    resources.aiTokensK * c.aiUsdPer1kTokens +
    resources.scraperRuns * c.scraperUsdPerRun +
    resources.infraHours * c.infraUsdPerHour +
    resources.supportHours * c.supportUsdPerHour +
    resources.storageGbMonth * c.storageUsdPerGbMonth;

  usd *= complexityMult;

  if (billing === 'yearly') {
    usd *= 12 * getPricingConfig().yearlyInfraDiscount;
  } else if (billing === 'monthly') {
    /* monthly resources as-is */
  } else {
    /* one_time — single burst */
  }

  return roundPriceEur(usd * eurUsd);
}

/** Market willingness-to-pay from TAM, competition, category tier. */
export function computeMarketValueEur(input: {
  anchorEur: number;
  pricingTier: PricingTier;
  industryCategory?: string | null;
  tamEstimateUsd?: number | null;
  competitionScore?: number | null;
  marketIntensity?: number | null;
}): { marketEur: number; factors: QuoteBreakdown['factors'] } {
  const tierMultiplier = getPricingConfig().tierMultipliers[input.pricingTier] ?? 1;
  const categoryMarketIndex = getCategoryMarketIndex(input.industryCategory);
  const tam = input.tamEstimateUsd ?? getPricingConfig().defaultTamUsd;
  const tamFactor = clamp(Math.log10(Math.max(tam, 5000) / 10_000) + 1.15, 0.75, 2.2);

  const competition = clamp(input.competitionScore ?? 50, 0, 100);
  const competitionFactor = 1 - (competition / 100) * getPricingConfig().competitionDiscountMax;

  const intensity = clamp(input.marketIntensity ?? 50, 0, 100);
  const intensityFactor = 0.82 + intensity / 250;

  const marketEur =
    input.anchorEur * tierMultiplier * categoryMarketIndex * tamFactor * competitionFactor * intensityFactor;
  return {
    marketEur,
    factors: { tamFactor, competitionFactor, intensityFactor, tierMultiplier, categoryMarketIndex },
  };
}

function applyPaymentFees(subtotalEur: number, provider: PaymentProviderId): { feeEur: number; clientEur: number } {
  const { feeRate, fixedEur } = getProviderFees(provider);
  // Pass provider fee to client: price such that after fee we keep subtotal
  const clientEur = feeRate > 0 ? (subtotalEur + fixedEur) / (1 - feeRate) : subtotalEur + fixedEur;
  const feeEur = clientEur - subtotalEur;
  return { feeEur: roundPriceEur(feeEur), clientEur: roundPriceEur(clientEur) };
}

export function calculateDeliverableQuote(input: QuoteInput): QuoteBreakdown {
  const deliverable = getDeliverable(input.deliverableId);
  if (!deliverable) {
    throw new Error(`Unknown deliverable: ${input.deliverableId}`);
  }

  const billing = input.billingCycle ?? deliverable.billing;
  const ctx = resolveIndustryContext({
    industryCategory: input.industryCategory,
    verticalSlug: input.verticalSlug,
  });
  const pricingTier = ctx.pricingTier;
  const provider = input.paymentProvider ?? (config.payments.mode === 'live' ? 'stripe' : 'manual');
  const subtypeIntensityBoost = ctx.vertical ? 1.04 : 1;

  const resourceCostEur = computeResourceCostEur(deliverable.resources, billing);
  const { marketEur, factors } = computeMarketValueEur({
    anchorEur: deliverable.anchorEur,
    pricingTier,
    industryCategory: input.industryCategory,
    tamEstimateUsd: input.tamEstimateUsd,
    competitionScore: input.competitionScore,
    marketIntensity: input.marketIntensity,
  });

  const marginPct = getPricingConfig().targetMarginPct / 100;
  const costFloor = resourceCostEur * (1 + marginPct);
  const subtotalEur = roundPriceEur(
    Math.max(marketEur, costFloor, deliverable.anchorEur * factors.tierMultiplier * 0.65) * subtypeIntensityBoost,
  );
  const marginEur = roundPriceEur(Math.max(0, subtotalEur - resourceCostEur));

  const { feeEur, clientEur } = applyPaymentFees(subtotalEur, provider);

  const quote: QuoteBreakdown = {
    deliverableId: deliverable.id,
    deliverableName: deliverable.nameSr,
    billing,
    currency: 'EUR',
    anchorEur: deliverable.anchorEur,
    resourceCostEur,
    marketValueEur: roundPriceEur(marketEur),
    marginEur,
    subtotalEur,
    paymentFeeEur: feeEur,
    paymentProvider: provider,
    clientPriceEur: clientEur,
    pricingTier,
    industryCategory: ctx.industryCategory,
    verticalSlug: ctx.verticalSlug,
    verticalName: ctx.vertical?.name ?? null,
    factors,
    resources: deliverable.resources,
  };

  if (billing === 'monthly') {
    const yearlyResources = { ...deliverable.resources };
    const yearlyResourceCost = computeResourceCostEur(yearlyResources, 'yearly');
    const yearlyMarket = computeMarketValueEur({
      anchorEur: deliverable.anchorEur * 10,
      pricingTier,
      industryCategory: input.industryCategory,
      tamEstimateUsd: input.tamEstimateUsd,
      competitionScore: input.competitionScore,
      marketIntensity: input.marketIntensity,
    });
    const yearlySubtotal = roundPriceEur(
      Math.max(yearlyMarket.marketEur, yearlyResourceCost * (1 + marginPct), deliverable.anchorEur * 10 * factors.tierMultiplier * 0.6),
    );
    quote.clientPriceYearlyEur = applyPaymentFees(yearlySubtotal, provider).clientEur;
  }

  return quote;
}

export function quoteAllDeliverables(input: Omit<QuoteInput, 'deliverableId'>): QuoteBreakdown[] {
  return listDeliverables().map((d) =>
    calculateDeliverableQuote({ ...input, deliverableId: d.id }),
  );
}

export function quoteVerticalPackage(input: {
  industryCategory?: string;
  verticalSlug?: string;
  tamEstimateUsd?: number | null;
  competitionScore?: number | null;
  marketIntensity?: number | null;
  paymentProvider?: PaymentProviderId;
}): QuoteBreakdown {
  return calculateDeliverableQuote({
    deliverableId: 'vertical-package',
    industryCategory: input.industryCategory,
    verticalSlug: input.verticalSlug,
    billingCycle: 'monthly',
    tamEstimateUsd: input.tamEstimateUsd,
    competitionScore: input.competitionScore,
    marketIntensity: input.marketIntensity,
    paymentProvider: input.paymentProvider,
  });
}
