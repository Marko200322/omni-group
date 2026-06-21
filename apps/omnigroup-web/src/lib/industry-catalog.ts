/** Industry catalog types — podaci sa GET /api/atina/billing/industry-catalog */

import {
  getIndustryCategory,
  INDUSTRY_CATEGORIES,
  resolvePricingTier,
  type IndustryCategoryMeta,
  type PricingTier,
} from './category-pricing';

export type SubIndustryMeta = {
  slug: string;
  subtype: string;
  name: string;
  category: string;
};

export type IndustryCatalogCategory = IndustryCategoryMeta & {
  subIndustries: SubIndustryMeta[];
};

export type IndustryCatalogResponse = {
  categoryCount: number;
  subIndustryCount: number;
  totalVerticals: number;
  categories: IndustryCatalogCategory[];
};

export type ResolvedVertical = {
  verticalSlug: string;
  category: string;
  subtype: string;
  name: string;
  categoryMeta: IndustryCategoryMeta | null;
  pricingTier: PricingTier;
};

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

export function resolveVerticalSlug(
  verticalSlug: string | null | undefined,
  catalog?: IndustryCatalogCategory[],
): ResolvedVertical | null {
  if (!verticalSlug?.trim()) return null;
  const slug = verticalSlug.trim().toLowerCase();

  if (catalog) {
    for (const cat of catalog) {
      const sub = cat.subIndustries.find((s) => s.slug === slug);
      if (sub) {
        const categoryMeta = getIndustryCategory(sub.category);
        return {
          verticalSlug: slug,
          category: sub.category,
          subtype: sub.subtype,
          name: sub.name,
          categoryMeta,
          pricingTier: resolvePricingTier(sub.category),
        };
      }
    }
  }

  for (const cat of INDUSTRY_CATEGORIES) {
    const prefix = `${cat.slug.replace(/_/g, '-')}-`;
    if (slug.startsWith(prefix)) {
      const subtype = slug.slice(prefix.length);
      return {
        verticalSlug: slug,
        category: cat.slug,
        subtype,
        name: `${titleCaseSubtype(subtype)} (${cat.name})`,
        categoryMeta: cat,
        pricingTier: cat.tier,
      };
    }
  }
  return null;
}

export function resolveIndustryContext(input: {
  industryCategory?: string | null;
  verticalSlug?: string | null;
  catalog?: IndustryCatalogCategory[];
}) {
  const vertical = resolveVerticalSlug(input.verticalSlug, input.catalog);
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
    verticalSlug: null as string | null,
    vertical: null as ResolvedVertical | null,
    pricingTier: resolvePricingTier(cat),
  };
}

export async function fetchIndustryCatalog(): Promise<IndustryCatalogResponse | null> {
  try {
    const res = await fetch('/api/atina/billing/industry-catalog', { cache: 'no-store' });
    const json = (await res.json()) as { ok?: boolean; data?: IndustryCatalogResponse };
    if (json.ok && json.data) return json.data;
  } catch {
    /* ignore */
  }
  return null;
}
