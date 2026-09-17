/**
 * Export all verticals with dynamic pricing + owner net projection.
 * Usage: npx tsx scripts/export-verticals-market-csv.ts [--out-dir path]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';
import { calculateDeliverableQuote } from '../src/modules/billing/lib/dynamic-pricing.engine';
import { getCategoryMarketIndex } from '../src/modules/billing/lib/market-pricing';
import { getIndustryCategory, resolvePricingTier } from '../src/modules/billing/lib/category-pricing';
import { getCategoryDeliveryProfile } from '../src/modules/autonomy-loop/lib/vertical-delivery-profiles';
import { config } from '../src/config';

type VerticalEntry = {
  slug: string;
  name: string;
  category: string;
  hasPage?: boolean;
  hasOutreach?: boolean;
  href?: string;
};

const SYSTEM_REINVEST = config.revenueAllocation.systemReinvestRate;
const QUALITY_PASS = 0.95;

function repoRoot(): string {
  return resolve(__dirname, '../../..');
}

function loadVerticals(): VerticalEntry[] {
  const indexPath = join(
    repoRoot(),
    'apps/omnigroup-web/src/lib/generated-verticals-index.json',
  );
  const raw = JSON.parse(readFileSync(indexPath, 'utf8')) as { verticals: VerticalEntry[] };
  return raw.verticals;
}

function ownerNet(clientEur: number, resourceEur: number): number {
  return Math.round(Math.max(0, clientEur - resourceEur) * (1 - SYSTEM_REINVEST));
}

function csvEscape(value: string | number | boolean): string {
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function researchSignals(category: string) {
  const profile = getCategoryDeliveryProfile(category);
  const intensity = profile.marketIntensityDefault;
  return {
    intensity,
    tam: Math.round(50_000 + intensity * 1200 + category.length * 800),
    competition: Math.min(100, 30 + Math.round(intensity / 2)),
  };
}

function buildRows(verticals: VerticalEntry[]) {
  return verticals.map((v) => {
    const { intensity, tam, competition } = researchSignals(v.category);
    const primaryId = getCategoryDeliveryProfile(v.category).primaryDeliverables[0] ?? 'vertical-package';
    const verticalQuote = calculateDeliverableQuote({
      deliverableId: 'vertical-package',
      industryCategory: v.category,
      verticalSlug: v.slug,
      paymentProvider: 'manual',
      marketIntensity: intensity,
      tamEstimateUsd: tam,
      competitionScore: competition,
    });
    const primaryQuote = calculateDeliverableQuote({
      deliverableId: primaryId,
      industryCategory: v.category,
      verticalSlug: v.slug,
      paymentProvider: 'manual',
      marketIntensity: intensity,
      tamEstimateUsd: tam,
      competitionScore: competition,
    });
    const meta = getIndustryCategory(v.category);
    const tier = resolvePricingTier(v.category);
    const marketIndex = getCategoryMarketIndex(v.category);
    const netVertical = ownerNet(verticalQuote.clientPriceEur, verticalQuote.resourceCostEur);
    return {
      slug: v.slug,
      name: v.name,
      category: v.category,
      categoryNameSr: meta?.nameSr ?? v.category,
      tier,
      marketIndex,
      intensity,
      tam,
      competition,
      primaryId,
      verticalClient: verticalQuote.clientPriceEur,
      primaryClient: primaryQuote.clientPriceEur,
      resourceCost: verticalQuote.resourceCostEur,
      ownerNetVertical: netVertical,
      ownerNetPrimary: ownerNet(primaryQuote.clientPriceEur, primaryQuote.resourceCostEur),
      ownerNetQuality: Math.round(netVertical * QUALITY_PASS),
      hasPage: v.hasPage ?? false,
      hasOutreach: v.hasOutreach ?? false,
      href: v.href ?? `/solutions/${v.slug}`,
    };
  });
}

function rowsToCsv(rows: ReturnType<typeof buildRows>): string {
  const headers = [
    'slug',
    'name',
    'category',
    'category_name_sr',
    'pricing_tier',
    'market_index',
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
        r.tier,
        r.marketIndex,
        r.intensity,
        r.tam,
        r.competition,
        r.primaryId,
        r.verticalClient,
        r.primaryClient,
        r.resourceCost,
        r.ownerNetVertical,
        r.ownerNetPrimary,
        r.ownerNetQuality,
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

function aggregateCsv(rows: ReturnType<typeof buildRows>): string {
  const map = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = map.get(r.category) ?? [];
    list.push(r);
    map.set(r.category, list);
  }
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
  for (const [, items] of [...map.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const avg = (fn: (x: (typeof rows)[0]) => number) =>
      Math.round(items.reduce((s, r) => s + fn(r), 0) / items.length);
    lines.push(
      [
        items[0].category,
        items[0].categoryNameSr,
        items.length,
        Math.round((items.reduce((s, r) => s + r.marketIndex, 0) / items.length) * 100) / 100,
        avg((r) => r.verticalClient),
        avg((r) => r.ownerNetVertical),
        avg((r) => r.ownerNetQuality),
        items.reduce((s, r) => s + r.ownerNetVertical, 0),
      ]
        .map(csvEscape)
        .join(','),
    );
  }
  return lines.join('\n');
}

const outIdx = process.argv.indexOf('--out-dir');
const outDir =
  outIdx >= 0 && process.argv[outIdx + 1]
    ? resolve(process.argv[outIdx + 1])
    : resolve(repoRoot(), 'data/exports');

mkdirSync(outDir, { recursive: true });
const date = new Date().toISOString().slice(0, 10);
const verticals = loadVerticals();
const rows = buildRows(verticals);

const files = [
  { name: `market-verticals-only-${date}.csv`, content: rowsToCsv(rows) },
  { name: `market-categories-${date}.csv`, content: aggregateCsv(rows) },
  {
    name: `market-verticals-full-${date}.csv`,
    content: ['# verticals', rowsToCsv(rows), '', '# category_aggregates', aggregateCsv(rows)].join('\n'),
  },
];

for (const f of files) {
  const path = join(outDir, f.name);
  writeFileSync(path, f.content, 'utf8');
  console.log(`Wrote ${path}`);
}

console.log(`Done — ${rows.length} verticals, ${new Set(rows.map((r) => r.category)).size} categories`);
