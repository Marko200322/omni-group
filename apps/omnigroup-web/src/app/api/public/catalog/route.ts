import { NextRequest, NextResponse } from 'next/server';
import { INDUSTRY_CATEGORIES } from '@/lib/category-pricing';
import {
  BASE_DELIVERABLE_CATALOG,
  FULL_PACKAGE_CATALOG,
} from '@/lib/deliverable-catalog';

/**
 * Public catalog counts / industry-filtered sample for buyers and audits.
 * Does not dump all ~1000 rows unless `?industry=` is set (then ~20 for that industry).
 */
export async function GET(req: NextRequest) {
  const industry = (req.nextUrl.searchParams.get('industry') || '').trim().toLowerCase();
  const includeIds = req.nextUrl.searchParams.get('ids') === '1';

  const filtered = industry
    ? FULL_PACKAGE_CATALOG.filter((d) => d.industrySlug === industry)
    : [];

  const body = {
    ok: true,
    basePackages: BASE_DELIVERABLE_CATALOG.length,
    industryGroups: INDUSTRY_CATEGORIES.length,
    sellablePackages: FULL_PACKAGE_CATALOG.length,
    industry: industry || null,
    filteredCount: industry ? filtered.length : null,
    sample: (industry ? filtered : FULL_PACKAGE_CATALOG).slice(0, 5).map((d) => ({
      id: d.id,
      name: d.name,
      industrySlug: d.industrySlug,
      problems: d.problemsSolved?.length ?? 0,
    })),
    ...(includeIds && industry
      ? { ids: filtered.map((d) => d.id) }
      : {}),
  };

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
