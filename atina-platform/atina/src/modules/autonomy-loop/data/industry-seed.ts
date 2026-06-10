/** Industry verticals — freelance platform + legacy SMB × subtype matrix. */

import { CUSTOM_SUBTYPES } from './custom-subtypes';
import {
  FREELANCE_PLATFORM_CATEGORY_META,
  FREELANCE_PLATFORM_SUBTYPES,
} from './freelance-platform-taxonomy';
import { LEGACY_SMB_SUBTYPES } from './legacy-smb-subtypes';

export type IndustrySeedEntry = {
  category: string;
  subtype: string;
  slug: string;
  name: string;
};

const CATEGORY_LABEL = new Map(
  FREELANCE_PLATFORM_CATEGORY_META.map((c) => [c.slug, c.name] as const),
);

function slugify(category: string, subtype: string): string {
  return `${category}-${subtype}`.replace(/_/g, '-').toLowerCase();
}

function titleCase(s: string): string {
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function categoryLabel(category: string): string {
  return CATEGORY_LABEL.get(category) ?? titleCase(category.replace(/_/g, '-'));
}

function mergeSubtypeMaps(...maps: Record<string, string[]>[]): Record<string, string[]> {
  const merged: Record<string, string[]> = {};
  for (const map of maps) {
    for (const [category, subtypes] of Object.entries(map)) {
      const base = merged[category] ?? [];
      const seen = new Set(base);
      for (const st of subtypes) {
        if (!seen.has(st)) {
          base.push(st);
          seen.add(st);
        }
      }
      merged[category] = base;
    }
  }
  for (const [category, extra] of Object.entries(CUSTOM_SUBTYPES)) {
    const base = merged[category] ?? [];
    const seen = new Set(base);
    for (const st of extra) {
      if (!seen.has(st)) {
        base.push(st);
        seen.add(st);
      }
    }
    merged[category] = base;
  }
  return merged;
}

export function buildIndustrySeedEntries(): IndustrySeedEntry[] {
  const allSubtypes = mergeSubtypeMaps(FREELANCE_PLATFORM_SUBTYPES, LEGACY_SMB_SUBTYPES);
  const entries: IndustrySeedEntry[] = [];
  for (const [category, subtypes] of Object.entries(allSubtypes)) {
    const catLabel = categoryLabel(category);
    for (const subtype of subtypes) {
      const slug = slugify(category, subtype);
      entries.push({
        category,
        subtype,
        slug,
        name: `${titleCase(subtype)} (${catLabel})`,
      });
    }
  }
  return entries;
}

export const INDUSTRY_SEED_COUNT = buildIndustrySeedEntries().length;

export const FREELANCE_VERTICAL_COUNT = Object.values(FREELANCE_PLATFORM_SUBTYPES).reduce(
  (n, a) => n + a.length,
  0,
);

export const LEGACY_SMB_VERTICAL_COUNT = Object.values(LEGACY_SMB_SUBTYPES).reduce(
  (n, a) => n + a.length,
  0,
);
