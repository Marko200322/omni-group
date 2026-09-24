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

const TITLE_ACRONYMS: Record<string, string> = {
  ai: 'AI',
  llm: 'LLM',
  seo: 'SEO',
  crm: 'CRM',
  hr: 'HR',
  it: 'IT',
  api: 'API',
  saas: 'SaaS',
  ppc: 'PPC',
  ux: 'UX',
  ui: 'UI',
  iot: 'IoT',
  nlp: 'NLP',
  b2b: 'B2B',
  b2c: 'B2C',
  qa: 'QA',
  kpi: 'KPI',
  roi: 'ROI',
  ios: 'iOS',
  aws: 'AWS',
  nft: 'NFT',
  gdpr: 'GDPR',
  rag: 'RAG',
  ev: 'EV',
  sem: 'SEM',
};

function titleCaseWord(word: string): string {
  const mapped = TITLE_ACRONYMS[word.toLowerCase()];
  if (mapped) return mapped;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function titleCaseSubtype(s: string): string {
  return s.split('-').map(titleCaseWord).join(' ');
}

/** Fix “Generative Ai” / “Llm Development” on generated catalog titles. */
export function formatPublicTitle(name: string): string {
  return name.replace(/\b([A-Za-z0-9]+)\b/g, titleCaseWord);
}

/** Swap known acronyms in sentences without Title Casing the rest. */
export function fixPublicAcronyms(text: string): string {
  return text.replace(
    /\b(Ai|Llm|Seo|Crm|Hr|It|Api|Saas|Ppc|Ux|Ui|Iot|Nlp|B2b|B2c|Qa|Kpi|Roi|Ios|Aws|Nft|Gdpr|Rag|Ev|Sem)\b/g,
    (word) => TITLE_ACRONYMS[word.toLowerCase()] ?? word,
  );
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
