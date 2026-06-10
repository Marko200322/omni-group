'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FREELANCE_INDUSTRY_CATEGORIES,
  INDUSTRY_CATEGORIES,
  LEGACY_SMB_INDUSTRY_CATEGORIES,
  PRICING_TIER_META,
  getIndustryCategory,
  resolvePricingTier,
} from '@/lib/category-pricing';
import type { IndustryCatalogCategory } from '@/lib/industry-catalog';

export type IndustrySelection = {
  industryCategory: string;
  verticalSlug: string;
};

type Props = {
  industryCategory: string;
  verticalSlug: string;
  onChange: (selection: IndustrySelection) => void;
  className?: string;
  showTierHint?: boolean;
};

export function IndustryVerticalSelect({
  industryCategory,
  verticalSlug,
  onChange,
  className,
  showTierHint = true,
}: Props) {
  const [catalog, setCatalog] = useState<IndustryCatalogCategory[]>(INDUSTRY_CATEGORIES.map((c) => ({ ...c, subIndustries: [] })));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/atina/billing/industry-catalog')
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { categories?: IndustryCatalogCategory[] } }) => {
        if (!cancelled && json.ok && json.data?.categories?.length) {
          setCatalog(json.data.categories);
        }
      })
      .catch(() => {
        /* fallback: parent categories only */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subIndustries = useMemo(() => {
    if (!industryCategory) return [];
    const cat = catalog.find((c) => c.slug === industryCategory);
    return cat?.subIndustries ?? [];
  }, [catalog, industryCategory]);

  const selected = getIndustryCategory(industryCategory);
  const tier = resolvePricingTier(industryCategory);
  const selectedSub = subIndustries.find((s) => s.slug === verticalSlug);

  return (
    <div className={className}>
      <label className="block text-sm">
        <span className="text-slate-400">Industrija</span>
        <select
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          value={industryCategory}
          onChange={(e) => {
            onChange({ industryCategory: e.target.value, verticalSlug: '' });
          }}
        >
          <option value="">Standard (prosečan SMB)</option>
          <optgroup label="Freelance platforma">
            {FREELANCE_INDUSTRY_CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.nameSr} — {PRICING_TIER_META[cat.tier].labelSr}
              </option>
            ))}
          </optgroup>
          <optgroup label="SMB vertikale (legacy)">
            {LEGACY_SMB_INDUSTRY_CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.nameSr} — {PRICING_TIER_META[cat.tier].labelSr}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      {industryCategory && (
        <label className="mt-3 block text-sm">
          <span className="text-slate-400">
            Pod-industrija {loading ? '(učitavam…)' : subIndustries.length ? '' : '(opšta)'}
          </span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={verticalSlug}
            disabled={!subIndustries.length}
            onChange={(e) => onChange({ industryCategory, verticalSlug: e.target.value })}
          >
            <option value="">Sve pod-industrije u {selected?.nameSr ?? industryCategory}</option>
            {subIndustries.map((sub) => (
              <option key={sub.slug} value={sub.slug}>
                {sub.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {showTierHint && selected && (
        <p className="mt-2 text-xs text-slate-500">
          Tarifni nivo: <span className="text-violet-300">{PRICING_TIER_META[tier].labelSr}</span>
          {selectedSub ? (
            <>
              {' '}
              · Isporuka za: <span className="text-violet-300">{selectedSub.name}</span>
            </>
          ) : null}
          {!selectedSub && <> — {PRICING_TIER_META[tier].description}</>}
        </p>
      )}
    </div>
  );
}
