/**
 * First-class sellable packages: one SKU per (base capability × industry).
 * Target: 20 bases × 50 industries = 1000 real catalog products.
 * Each SKU lists 5–10 industry-specific problems and maps to a real fulfillment handler.
 *
 * This is NOT a "combinations view" of 20 products — each entry is a distinct sellable package
 * with unique id, name, problem list, and locked industry context for fulfillment.
 */
import {
  BASE_DELIVERABLE_CATALOG_HONEST,
  BASE_DELIVERABLE_COUNT,
  type DeliverableDefinition,
} from './base-deliverable-catalog';
import {
  INDUSTRY_CATEGORIES,
  PRICING_TIER_META,
  getIndustryCategory,
  resolvePricingTier,
  roundCategoryPrice,
} from './category-pricing';
import { buildIndustryPackageId } from './industry-package-id';
import { getCategoryMarketIndex } from './market-pricing';
import {
  listResolvedPackageIndustryProblems,
  MAX_PROBLEMS_COVERED,
  MIN_PROBLEMS_COVERED,
} from './package-industry-problems';

export const TARGET_PACKAGE_COUNT = BASE_DELIVERABLE_COUNT * INDUSTRY_CATEGORIES.length;

function buildIndustryPackage(
  base: DeliverableDefinition,
  industrySlug: string,
): DeliverableDefinition | null {
  const cat = getIndustryCategory(industrySlug);
  if (!cat) return null;

  const problemsSolved = listResolvedPackageIndustryProblems(base.id, industrySlug);
  if (problemsSolved.length < MIN_PROBLEMS_COVERED) return null;
  if (problemsSolved.length > MAX_PROBLEMS_COVERED) {
    problemsSolved.length = MAX_PROBLEMS_COVERED;
  }

  const id = buildIndustryPackageId(base.id, industrySlug);
  const label = cat.name;
  const labelSr = cat.nameSr || label;
  const tier = resolvePricingTier(industrySlug);
  const mult = PRICING_TIER_META[tier].multiplier * getCategoryMarketIndex(industrySlug);
  const anchorEur = roundCategoryPrice(base.anchorEur * mult);

  const problemPreview = problemsSolved
    .slice(0, 3)
    .map((p) => p.replace(/^[^:]+:\s*/, ''))
    .join('; ');

  return {
    ...base,
    id,
    name: `${label} — ${base.name}`,
    nameSr: `${labelSr} — ${base.nameSr}`,
    description: [
      `Industry package for ${label}: ${base.description}`,
      `Solves ${problemsSolved.length} problems including: ${problemPreview}.`,
    ].join(' '),
    bestFor: `companies in ${label} that need ${base.name.toLowerCase()}`,
    anchorEur,
    baseDeliverableId: base.id,
    industrySlug,
    problemsSolved,
    isIndustryPackage: true,
  };
}

let cached: DeliverableDefinition[] | null = null;

/** Build (and cache) the full sellable catalog of ~1000 industry packages. */
export function buildThousandPackageCatalog(): DeliverableDefinition[] {
  if (cached) return cached;
  const out: DeliverableDefinition[] = [];
  for (const industry of INDUSTRY_CATEGORIES) {
    for (const base of BASE_DELIVERABLE_CATALOG_HONEST) {
      const pkg = buildIndustryPackage(base, industry.slug);
      if (pkg) out.push(pkg);
    }
  }
  cached = out;
  return out;
}

export function thousandPackageCatalogStats() {
  const packages = buildThousandPackageCatalog();
  const problemCounts = packages.map((p) => p.problemsSolved?.length ?? 0);
  const minProblems = problemCounts.length ? Math.min(...problemCounts) : 0;
  const maxProblems = problemCounts.length ? Math.max(...problemCounts) : 0;
  const belowFloor = packages.filter(
    (p) => (p.problemsSolved?.length ?? 0) < MIN_PROBLEMS_COVERED,
  ).length;
  return {
    baseCount: BASE_DELIVERABLE_COUNT,
    industryCount: INDUSTRY_CATEGORIES.length,
    targetCount: TARGET_PACKAGE_COUNT,
    catalogCount: packages.length,
    minProblems,
    maxProblems,
    belowFloor,
    ready: packages.length === TARGET_PACKAGE_COUNT && belowFloor === 0,
  };
}
