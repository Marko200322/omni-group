/**
 * Client mirror: ~1000 first-class industry packages (base capability × industry).
 * Keep in sync with atina-platform/.../thousand-package-catalog.ts
 */
import { INDUSTRY_CATEGORIES, type IndustryCategoryMeta } from './category-pricing';
import { PACKAGE_PROBLEM_SPECS_WEB } from './package-problem-specs';
import type { DeliverableDefinition } from './deliverable-catalog-types';

const SEP = '__';

function problemsFor(baseId: string, industry: IndustryCategoryMeta): string[] {
  const spec = PACKAGE_PROBLEM_SPECS_WEB[baseId];
  if (!spec) return [];
  const primary = `${industry.name}: ${spec.primary}`;
  const secondary = spec.secondary.slice(0, 9);
  return [primary, ...secondary].slice(0, 10);
}

export function buildIndustryPackageId(baseId: string, industrySlug: string): string {
  return `${baseId}${SEP}${industrySlug}`;
}

export function buildThousandPackageCatalog(
  baseCatalog: DeliverableDefinition[],
): DeliverableDefinition[] {
  const out: DeliverableDefinition[] = [];
  for (const industry of INDUSTRY_CATEGORIES) {
    for (const base of baseCatalog) {
      const problemsSolved = problemsFor(base.id, industry);
      if (problemsSolved.length < 5) continue;
      out.push({
        ...base,
        id: buildIndustryPackageId(base.id, industry.slug),
        name: `${industry.name} — ${base.name}`,
        nameSr: `${industry.nameSr} — ${base.nameSr}`,
        description: `${base.description} Industry package for ${industry.name}. Solves ${problemsSolved.length} problems.`,
        bestFor: `companies in ${industry.name} that need ${base.name.toLowerCase()}`,
        baseDeliverableId: base.id,
        industrySlug: industry.slug,
        problemsSolved,
        isIndustryPackage: true,
      });
    }
  }
  return out;
}

export function parseIndustryPackageId(id: string): { baseId: string; industrySlug: string } | null {
  const idx = id.indexOf(SEP);
  if (idx <= 0) return null;
  return { baseId: id.slice(0, idx), industrySlug: id.slice(idx + SEP.length) };
}
