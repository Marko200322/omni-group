/**
 * Market analytics — mirrors atina dynamic-pricing.engine + revenue allocation defaults.
 * Used for CSV export, industry simulation, and catalog KPI (no DB required).
 */

import generatedVerticalsIndex from './generated-verticals-index.json';
import { getDeliverable, type DeliverableBilling, type ResourceProfile } from './deliverable-catalog';
import { getIndustryCategory, resolvePricingTier, type PricingTier } from './category-pricing';
import { getCategoryMarketIndex, formatMarketIndexLabel } from './market-pricing';
import {
  getCategoryMarketIntensity,
  getCategoryPrimaryDeliverable,
} from './market-intensity-defaults';
import type { AtinaAdminOverview } from './atina-live-types';

/** Sync with atina config defaults */
const PRICING = {
  eurUsdRate: 0.92,
  targetMarginPct: 35,
  defaultTamUsd: 50_000,
  competitionDiscountMax: 0.25,
  systemReinvestRate: 0.2,
  qualityPassRateDefault: 0.95,
  resourceUnitCosts: {
    aiUsdPer1kTokens: 0.002,
    scraperUsdPerRun: 0.05,
    infraUsdPerHour: 2,
    supportUsdPerHour: 25,
    storageUsdPerGbMonth: 0.1,
  },
  tierMultipliers: {
    budget: 0.75,
    standard: 1,
    premium: 1.35,
    regulated: 1.65,
    nonprofit: 0.6,
  } satisfies Record<PricingTier, number>,
};

export type VerticalIndexEntry = {
  slug: string;
  name: string;
  category: string;
  valueProp?: string;
  hasPage?: boolean;
  hasOutreach?: boolean;
  updatedAt?: string;
  href?: string;
};

export type VerticalPricingRow = {
  slug: string;
  name: string;
  category: string;
  categoryNameSr: string;
  pricingTier: PricingTier;
  marketIndex: number;
  marketIndexLabel: string;
  marketIntensity: number;
  tamEstimateUsd: number;
  competitionScore: number;
  primaryDeliverableId: string;
  verticalPackageClientEur: number;
  primaryDeliverableClientEur: number;
  resourceCostEur: number;
  ownerNetVerticalPackageEur: number;
  ownerNetPrimaryEur: number;
  ownerNetAfterQualityEur: number;
  proPlanMonthlyEur: number;
  hasPage: boolean;
  hasOutreach: boolean;
  href: string;
};

export type CategoryAggregateRow = {
  category: string;
  categoryNameSr: string;
  verticalCount: number;
  avgMarketIndex: number;
  avgVerticalPackageEur: number;
  avgOwnerNetEur: number;
  avgOwnerNetAfterQualityEur: number;
  totalOwnerNetPotentialEur: number;
};

export type IndustrySimulation = {
  category: string;
  categoryNameSr: string;
  verticalSlug: string;
  verticalName: string;
  pricingTier: PricingTier;
  marketIndex: number;
  marketIntensity: number;
  tamEstimateUsd: number;
  competitionScore: number;
  qualityPassRate: number;
  packages: Array<{
    deliverableId: string;
    nameSr: string;
    billing: DeliverableBilling;
    clientPriceEur: number;
    resourceCostEur: number;
    ownerNetEur: number;
    ownerNetAfterQualityEur: number;
    marginPct: number;
  }>;
  titanisPipeline: {
    followUpTarget25: { conversions: number; estimatedRevenueEur: number };
    closeTarget50: { conversions: number; estimatedRevenueEur: number };
  };
  monthlyScenario: {
    oneRetainer: number;
    oneProject: number;
    combinedOwnerNetEur: number;
    combinedAfterQualityEur: number;
  };
  verticalsInCategory: number;
  sampleVerticals: Array<{ slug: string; name: string; ownerNetEur: number }>;
};

export type MarketCatalogStats = {
  totalVerticals: number;
  categoryCount: number;
  weightedAvgMarketIndex: number;
  withPage: number;
  withOutreach: number;
  topCategories: Array<{ category: string; count: number; avgOwnerNetEur: number }>;
};

export type LiveMarketKpi = {
  source: 'live' | 'catalog_only';
  fetchedAt: string;
  apiAvailable: boolean;
  catalog: MarketCatalogStats;
  live?: {
    totalUsers: number;
    activeUsers: number;
    totalRevenueEur: number;
    paymentCount: number;
    activeSubscriptions: number;
    ownerNetEur: number;
    systemReinvestEur: number;
    resourceReserveEur: number;
    workflowSuccessRate: number | null;
    fulfillmentQualityPassRate: number | null;
  };
};

export type RevenueAllocationSummary = {
  totals?: {
    grossEur?: number;
    ownerNetEur?: number;
    systemReinvestEur?: number;
    resourceReserveEur?: number;
    taxReserveEur?: number;
    paymentFeeEur?: number;
    paymentCount?: number;
  };
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundPriceEur(n: number): number {
  return Math.max(9, Math.round(n));
}

function computeResourceCostEur(resources: ResourceProfile, billing: DeliverableBilling): number {
  const c = PRICING.resourceUnitCosts;
  const complexityMult = 0.8 + resources.deployComplexity * 0.12;
  let usd =
    resources.aiTokensK * c.aiUsdPer1kTokens +
    resources.scraperRuns * c.scraperUsdPerRun +
    resources.infraHours * c.infraUsdPerHour +
    resources.supportHours * c.supportUsdPerHour +
    resources.storageGbMonth * c.storageUsdPerGbMonth;
  usd *= complexityMult;
  if (billing === 'yearly') usd *= 12 * 0.85;
  return roundPriceEur(usd * PRICING.eurUsdRate);
}

function computeMarketValueEur(input: {
  anchorEur: number;
  pricingTier: PricingTier;
  industryCategory: string;
  tamEstimateUsd: number;
  competitionScore: number;
  marketIntensity: number;
}): number {
  const tierMultiplier = PRICING.tierMultipliers[input.pricingTier] ?? 1;
  const categoryMarketIndex = getCategoryMarketIndex(input.industryCategory);
  const tamFactor = clamp(Math.log10(Math.max(input.tamEstimateUsd, 5000) / 10_000) + 1.15, 0.75, 2.2);
  const competition = clamp(input.competitionScore, 0, 100);
  const competitionFactor = 1 - (competition / 100) * PRICING.competitionDiscountMax;
  const intensityFactor = 0.82 + clamp(input.marketIntensity, 0, 100) / 250;
  return (
    input.anchorEur * tierMultiplier * categoryMarketIndex * tamFactor * competitionFactor * intensityFactor
  );
}

export function calculateDeliverableQuote(input: {
  deliverableId: string;
  industryCategory: string;
  verticalSlug?: string;
  tamEstimateUsd?: number;
  competitionScore?: number;
  marketIntensity?: number;
}): {
  clientPriceEur: number;
  resourceCostEur: number;
  ownerNetEur: number;
  ownerNetAfterQualityEur: number;
  marginPct: number;
  billing: DeliverableBilling;
  nameSr: string;
} {
  const deliverable = getDeliverable(input.deliverableId);
  if (!deliverable) {
    throw new Error(`Unknown deliverable: ${input.deliverableId}`);
  }

  const billing = deliverable.billing;
  const pricingTier = resolvePricingTier(input.industryCategory);
  const intensity = input.marketIntensity ?? getCategoryMarketIntensity(input.industryCategory);
  const tam =
    input.tamEstimateUsd ??
    Math.round(50_000 + intensity * 1200 + input.industryCategory.length * 800);
  const competition =
    input.competitionScore ?? Math.min(100, 30 + Math.round(intensity / 2));

  const resourceCostEur = computeResourceCostEur(deliverable.resources, billing);
  const marketEur = computeMarketValueEur({
    anchorEur: deliverable.anchorEur,
    pricingTier,
    industryCategory: input.industryCategory,
    tamEstimateUsd: tam,
    competitionScore: competition,
    marketIntensity: intensity,
  });

  const tierMultiplier = PRICING.tierMultipliers[pricingTier] ?? 1;
  const marginPct = PRICING.targetMarginPct / 100;
  const costFloor = resourceCostEur * (1 + marginPct);
  const subtypeBoost = input.verticalSlug ? 1.04 : 1;
  const subtotalEur = roundPriceEur(
    Math.max(marketEur, costFloor, deliverable.anchorEur * tierMultiplier * 0.65) * subtypeBoost,
  );
  const clientPriceEur = subtotalEur;
  const ownerNetEur = roundPriceEur(
    Math.max(0, clientPriceEur - resourceCostEur) * (1 - PRICING.systemReinvestRate),
  );
  const ownerNetAfterQualityEur = roundPriceEur(ownerNetEur * PRICING.qualityPassRateDefault);

  return {
    clientPriceEur,
    resourceCostEur,
    ownerNetEur,
    ownerNetAfterQualityEur,
    marginPct: clientPriceEur > 0 ? Math.round((ownerNetEur / clientPriceEur) * 100) : 0,
    billing,
    nameSr: deliverable.nameSr,
  };
}

function researchSignals(category: string, intensity?: number) {
  const marketIntensity = intensity ?? getCategoryMarketIntensity(category);
  return {
    marketIntensity,
    tamEstimateUsd: Math.round(50_000 + marketIntensity * 1200 + category.length * 800),
    competitionScore: Math.min(100, 30 + Math.round(marketIntensity / 2)),
  };
}

export function buildVerticalPricingRow(vertical: VerticalIndexEntry): VerticalPricingRow {
  const category = vertical.category;
  const meta = getIndustryCategory(category);
  const signals = researchSignals(category);
  const primaryId = getCategoryPrimaryDeliverable(category);
  const verticalQuote = calculateDeliverableQuote({
    deliverableId: 'vertical-package',
    industryCategory: category,
    verticalSlug: vertical.slug,
    ...signals,
  });
  const primaryQuote = calculateDeliverableQuote({
    deliverableId: primaryId,
    industryCategory: category,
    verticalSlug: vertical.slug,
    ...signals,
  });
  const marketIndex = getCategoryMarketIndex(category);
  const proTier = resolvePricingTier(category);
  const proPlanMonthlyEur = roundPriceEur(129 * PRICING.tierMultipliers[proTier] * marketIndex);

  return {
    slug: vertical.slug,
    name: vertical.name,
    category,
    categoryNameSr: meta?.nameSr ?? category,
    pricingTier: proTier,
    marketIndex,
    marketIndexLabel: formatMarketIndexLabel(marketIndex),
    marketIntensity: signals.marketIntensity,
    tamEstimateUsd: signals.tamEstimateUsd,
    competitionScore: signals.competitionScore,
    primaryDeliverableId: primaryId,
    verticalPackageClientEur: verticalQuote.clientPriceEur,
    primaryDeliverableClientEur: primaryQuote.clientPriceEur,
    resourceCostEur: verticalQuote.resourceCostEur,
    ownerNetVerticalPackageEur: verticalQuote.ownerNetEur,
    ownerNetPrimaryEur: primaryQuote.ownerNetEur,
    ownerNetAfterQualityEur: verticalQuote.ownerNetAfterQualityEur,
    proPlanMonthlyEur,
    hasPage: vertical.hasPage ?? false,
    hasOutreach: vertical.hasOutreach ?? false,
    href: vertical.href ?? `/solutions/${vertical.slug}`,
  };
}

export function listVerticalPricingRows(): VerticalPricingRow[] {
  const verticals = (generatedVerticalsIndex as { verticals: VerticalIndexEntry[] }).verticals;
  return verticals.map(buildVerticalPricingRow);
}

export function aggregateByCategory(rows: VerticalPricingRow[]): CategoryAggregateRow[] {
  const map = new Map<string, VerticalPricingRow[]>();
  for (const row of rows) {
    const list = map.get(row.category) ?? [];
    list.push(row);
    map.set(row.category, list);
  }
  return Array.from(map.entries())
    .map(([category, items]) => {
      const avg = (fn: (r: VerticalPricingRow) => number) =>
        Math.round(items.reduce((s: number, r: VerticalPricingRow) => s + fn(r), 0) / items.length);
      return {
        category,
        categoryNameSr: items[0]?.categoryNameSr ?? category,
        verticalCount: items.length,
        avgMarketIndex: Math.round((items.reduce((s: number, r: VerticalPricingRow) => s + r.marketIndex, 0) / items.length) * 100) / 100,
        avgVerticalPackageEur: avg((r) => r.verticalPackageClientEur),
        avgOwnerNetEur: avg((r) => r.ownerNetVerticalPackageEur),
        avgOwnerNetAfterQualityEur: avg((r) => r.ownerNetAfterQualityEur),
        totalOwnerNetPotentialEur: items.reduce((s: number, r: VerticalPricingRow) => s + r.ownerNetVerticalPackageEur, 0),
      };
    })
    .sort((a, b) => b.verticalCount - a.verticalCount);
}

export function buildMarketCatalogStats(rows?: VerticalPricingRow[]): MarketCatalogStats {
  const all = rows ?? listVerticalPricingRows();
  const verticals = (generatedVerticalsIndex as { verticals: VerticalIndexEntry[] }).verticals;
  const weighted = all.reduce((s, r) => s + r.marketIndex, 0) / Math.max(1, all.length);
  const byCat = aggregateByCategory(all);
  return {
    totalVerticals: verticals.length,
    categoryCount: byCat.length,
    weightedAvgMarketIndex: Math.round(weighted * 1000) / 1000,
    withPage: verticals.filter((v) => v.hasPage).length,
    withOutreach: verticals.filter((v) => v.hasOutreach).length,
    topCategories: byCat.slice(0, 8).map((c) => ({
      category: c.category,
      count: c.verticalCount,
      avgOwnerNetEur: c.avgOwnerNetEur,
    })),
  };
}

const SIMULATION_DELIVERABLES = [
  'vertical-package',
  'lead-gen-retainer',
  'setup-full',
  'landing',
  'website-business',
] as const;

export function simulateIndustry(input: {
  category?: string;
  verticalSlug?: string;
  qualityPassRate?: number;
}): IndustrySimulation {
  const verticals = (generatedVerticalsIndex as { verticals: VerticalIndexEntry[] }).verticals;
  const slug = input.verticalSlug?.trim();
  const categoryFilter = input.category?.trim().toLowerCase().replace(/\s+/g, '_');
  const qualityPassRate = input.qualityPassRate ?? PRICING.qualityPassRateDefault;

  let vertical: VerticalIndexEntry | undefined;
  if (slug) {
    vertical = verticals.find((v) => v.slug === slug);
  } else if (categoryFilter) {
    vertical = verticals.find((v) => v.category === categoryFilter);
  }
  if (!vertical) {
    vertical = verticals.find((v) => v.category === 'marketing') ?? verticals[0];
  }

  const category = vertical.category;
  const signals = researchSignals(category);
  const meta = getIndustryCategory(category);
  const inCategory = verticals.filter((v) => v.category === category);

  const packages = SIMULATION_DELIVERABLES.map((deliverableId) => {
    const q = calculateDeliverableQuote({
      deliverableId,
      industryCategory: category,
      verticalSlug: vertical!.slug,
      ...signals,
    });
    return {
      deliverableId,
      nameSr: q.nameSr,
      billing: q.billing,
      clientPriceEur: q.clientPriceEur,
      resourceCostEur: q.resourceCostEur,
      ownerNetEur: q.ownerNetEur,
      ownerNetAfterQualityEur: roundPriceEur(q.ownerNetEur * qualityPassRate),
      marginPct: q.marginPct,
    };
  });

  const retainer = packages.find((p) => p.deliverableId === 'lead-gen-retainer')!;
  const project = packages.find((p) => p.deliverableId === 'setup-full')!;

  const followUpLeads = Math.ceil(25 * 0.5);
  const followUpConv = Math.ceil(followUpLeads * 0.08);
  const closeLeads = Math.ceil(50 * 0.5);
  const closeConv = Math.ceil(closeLeads * 0.18);

  const sampleVerticals = inCategory.slice(0, 5).map((v) => {
    const row = buildVerticalPricingRow(v);
    return { slug: v.slug, name: v.name, ownerNetEur: row.ownerNetVerticalPackageEur };
  });

  return {
    category,
    categoryNameSr: meta?.nameSr ?? category,
    verticalSlug: vertical.slug,
    verticalName: vertical.name,
    pricingTier: resolvePricingTier(category),
    marketIndex: getCategoryMarketIndex(category),
    ...signals,
    qualityPassRate,
    packages,
    titanisPipeline: {
      followUpTarget25: {
        conversions: followUpConv,
        estimatedRevenueEur: followUpConv * 55,
      },
      closeTarget50: {
        conversions: closeConv,
        estimatedRevenueEur: closeConv * 120,
      },
    },
    monthlyScenario: {
      oneRetainer: retainer.ownerNetEur,
      oneProject: project.ownerNetEur,
      combinedOwnerNetEur: retainer.ownerNetEur + project.ownerNetEur,
      combinedAfterQualityEur: roundPriceEur(
        (retainer.ownerNetEur + project.ownerNetEur) * qualityPassRate,
      ),
    },
    verticalsInCategory: inCategory.length,
    sampleVerticals,
  };
}

export function buildLiveMarketKpi(
  overview: AtinaAdminOverview | null,
  allocation: RevenueAllocationSummary | null,
  apiAvailable: boolean,
): LiveMarketKpi {
  const catalog = buildMarketCatalogStats();
  const totals = allocation?.totals;
  const base: LiveMarketKpi = {
    source: overview ? 'live' : 'catalog_only',
    fetchedAt: new Date().toISOString(),
    apiAvailable,
    catalog,
  };

  if (!overview) return base;

  const wf = overview.workflowTemplatesExecutionSummary;
  return {
    ...base,
    source: 'live',
    live: {
      totalUsers: overview.users?.total ?? 0,
      activeUsers: overview.users?.active ?? 0,
      totalRevenueEur: overview.payments?.totalRevenue ?? 0,
      paymentCount: overview.payments?.total ?? 0,
      activeSubscriptions: overview.subscriptions?.active ?? 0,
      ownerNetEur: totals?.ownerNetEur ?? 0,
      systemReinvestEur: totals?.systemReinvestEur ?? 0,
      resourceReserveEur: totals?.resourceReserveEur ?? 0,
      workflowSuccessRate: typeof wf?.successRate === 'number' ? wf.successRate : null,
      fulfillmentQualityPassRate: PRICING.qualityPassRateDefault * 100,
    },
  };
}

function csvEscape(value: string | number | boolean): string {
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function verticalRowsToCsv(rows: VerticalPricingRow[]): string {
  const headers = [
    'slug',
    'name',
    'category',
    'category_name_sr',
    'pricing_tier',
    'market_index',
    'market_index_label',
    'market_intensity',
    'tam_estimate_usd',
    'competition_score',
    'primary_deliverable_id',
    'vertical_package_client_eur',
    'primary_deliverable_client_eur',
    'resource_cost_eur',
    'owner_net_vertical_package_eur',
    'owner_net_primary_eur',
    'owner_net_after_quality_eur',
    'pro_plan_monthly_eur',
    'has_page',
    'has_outreach',
    'href',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.slug,
        r.name,
        r.category,
        r.categoryNameSr,
        r.pricingTier,
        r.marketIndex,
        r.marketIndexLabel,
        r.marketIntensity,
        r.tamEstimateUsd,
        r.competitionScore,
        r.primaryDeliverableId,
        r.verticalPackageClientEur,
        r.primaryDeliverableClientEur,
        r.resourceCostEur,
        r.ownerNetVerticalPackageEur,
        r.ownerNetPrimaryEur,
        r.ownerNetAfterQualityEur,
        r.proPlanMonthlyEur,
        r.hasPage,
        r.hasOutreach,
        r.href,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return lines.join('\n');
}

export function categoryAggregatesToCsv(rows: CategoryAggregateRow[]): string {
  const headers = [
    'category',
    'category_name_sr',
    'vertical_count',
    'avg_market_index',
    'avg_vertical_package_eur',
    'avg_owner_net_eur',
    'avg_owner_net_after_quality_eur',
    'total_owner_net_potential_eur',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.category,
        r.categoryNameSr,
        r.verticalCount,
        r.avgMarketIndex,
        r.avgVerticalPackageEur,
        r.avgOwnerNetEur,
        r.avgOwnerNetAfterQualityEur,
        r.totalOwnerNetPotentialEur,
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return lines.join('\n');
}

export function buildFullMarketExportCsv(): string {
  const rows = listVerticalPricingRows();
  const aggregates = aggregateByCategory(rows);
  return [
    '# verticals',
    verticalRowsToCsv(rows),
    '',
    '# category_aggregates',
    categoryAggregatesToCsv(aggregates),
  ].join('\n');
}

export const MARKET_SIMULATION_PRESETS = [
  { id: 'marketing', label: 'Marketing (kategorija)', category: 'marketing' },
  { id: 'healthcare-dental', label: 'Healthcare — Dental', verticalSlug: 'healthcare-dental' },
  { id: 'development_it', label: 'Development & IT', category: 'development_it' },
  { id: 'ai_data', label: 'AI & Data', category: 'ai_data' },
] as const;
