/**
 * Jedinstveni katalog: industrija (25) × pod-industrija (500+).
 * Izvor istine za pricing, isporuke, autonomy i UI.
 */

import { buildIndustrySeedEntries, type IndustrySeedEntry } from '../../modules/autonomy-loop/data/industry-seed';
import {
  getIndustryCategory,
  INDUSTRY_CATEGORIES,
  type IndustryCategoryMeta,
  type PricingTier,
  resolvePricingTier,
} from '../../modules/billing/lib/category-pricing';

export type SubIndustryMeta = {
  slug: string;
  subtype: string;
  name: string;
  category: string;
};

export type IndustryCatalogCategory = IndustryCategoryMeta & {
  subIndustries: SubIndustryMeta[];
};

export type ResolvedVertical = {
  verticalSlug: string;
  category: string;
  subtype: string;
  name: string;
  categoryMeta: IndustryCategoryMeta | null;
  pricingTier: PricingTier;
};

/** Normalizuje category slug (home-services → home_services). */
export function normalizeCategorySlug(slug: string): string {
  const s = slug.trim().toLowerCase().replace(/-/g, '_');
  if (getIndustryCategory(s)) return s;
  const hyphen = s.replace(/_/g, '-');
  for (const cat of INDUSTRY_CATEGORIES) {
    if (cat.slug.replace(/_/g, '-') === hyphen) return cat.slug;
  }
  return s;
}

function titleCaseSubtype(s: string): string {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function groupEntriesByCategory(entries: IndustrySeedEntry[]): Map<string, SubIndustryMeta[]> {
  const map = new Map<string, SubIndustryMeta[]>();
  for (const e of entries) {
    const cat = normalizeCategorySlug(e.category);
    const list = map.get(cat) ?? [];
    list.push({
      slug: e.slug,
      subtype: e.subtype,
      name: e.name,
      category: cat,
    });
    map.set(cat, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return map;
}

let cachedCatalog: IndustryCatalogCategory[] | null = null;
let cachedBySlug: Map<string, SubIndustryMeta> | null = null;

function ensureCache(): void {
  if (cachedCatalog && cachedBySlug) return;
  const grouped = groupEntriesByCategory(buildIndustrySeedEntries());
  cachedBySlug = new Map();
  cachedCatalog = INDUSTRY_CATEGORIES.map((cat) => {
    const subIndustries = grouped.get(cat.slug) ?? [];
    for (const sub of subIndustries) {
      cachedBySlug!.set(sub.slug, sub);
    }
    return { ...cat, subIndustries };
  });
}

/** Puni katalog: 25 industrija sa pod-industrijama. */
export function getIndustryCatalog(): IndustryCatalogCategory[] {
  ensureCache();
  return cachedCatalog!;
}

export function getSubIndustriesForCategory(categorySlug: string): SubIndustryMeta[] {
  const cat = normalizeCategorySlug(categorySlug);
  return getIndustryCatalog().find((c) => c.slug === cat)?.subIndustries ?? [];
}

export function getSubIndustryBySlug(verticalSlug: string): SubIndustryMeta | null {
  ensureCache();
  return cachedBySlug!.get(verticalSlug.trim().toLowerCase()) ?? null;
}

/** Parsira vertical slug u parent category + subtype. */
export function resolveVerticalSlug(verticalSlug: string | null | undefined): ResolvedVertical | null {
  if (!verticalSlug?.trim()) return null;
  const slug = verticalSlug.trim().toLowerCase();
  const known = getSubIndustryBySlug(slug);
  if (known) {
    const categoryMeta = getIndustryCategory(known.category);
    return {
      verticalSlug: slug,
      category: known.category,
      subtype: known.subtype,
      name: known.name,
      categoryMeta,
      pricingTier: resolvePricingTier(known.category),
    };
  }
  for (const cat of INDUSTRY_CATEGORIES) {
    const prefix = `${cat.slug.replace(/_/g, '-')}-`;
    if (slug.startsWith(prefix)) {
      const subtype = slug.slice(prefix.length);
      return {
        verticalSlug: slug,
        category: cat.slug,
        subtype,
        name: `${titleCaseSubtype(subtype)} (${cat.nameSr})`,
        categoryMeta: cat,
        pricingTier: cat.tier,
      };
    }
  }
  return null;
}

/** Za pricing/checkout: vertical slug ili samo category. */
export function resolveIndustryContext(input: {
  industryCategory?: string | null;
  verticalSlug?: string | null;
}): {
  industryCategory: string | null;
  verticalSlug: string | null;
  vertical: ResolvedVertical | null;
  pricingTier: PricingTier;
} {
  const vertical = resolveVerticalSlug(input.verticalSlug);
  if (vertical) {
    return {
      industryCategory: vertical.category,
      verticalSlug: vertical.verticalSlug,
      vertical,
      pricingTier: vertical.pricingTier,
    };
  }
  const cat = input.industryCategory?.trim() ? normalizeCategorySlug(input.industryCategory) : null;
  return {
    industryCategory: cat,
    verticalSlug: null,
    vertical: null,
    pricingTier: resolvePricingTier(cat),
  };
}

export function getIndustryCatalogStats() {
  const catalog = getIndustryCatalog();
  const subCount = catalog.reduce((n, c) => n + c.subIndustries.length, 0);
  return {
    categoryCount: catalog.length,
    subIndustryCount: subCount,
    totalVerticals: subCount,
  };
}

/** Reset cache (tests). */
export function resetIndustryCatalogCache(): void {
  cachedCatalog = null;
  cachedBySlug = null;
}
