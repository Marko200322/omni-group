'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FREELANCE_INDUSTRY_CATEGORIES,
  INDUSTRY_CATEGORIES,
  LEGACY_SMB_INDUSTRY_CATEGORIES,
  PRICING_TIER_META,
  getIndustryCategory,
  resolvePricingTier,
  type PricingTier,
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

const TIER_DESCRIPTION_EN: Record<PricingTier, string> = {
  budget: 'Salons, hospitality, retail — lower entry, same modules.',
  standard: 'Average SMB — reference pricing from the site.',
  premium: 'Finance, legal, tech — more compliance and AI quotas.',
  regulated: 'Healthcare, public sector, energy — SLA and audit trail.',
  nonprofit: 'Discount for associations, foundations, and humanitarian orgs.',
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
        <span className="text-slate-400">Industry</span>
        <select
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          value={industryCategory}
          onChange={(e) => {
            onChange({ industryCategory: e.target.value, verticalSlug: '' });
          }}
        >
          <option value="">Standard (average SMB)</option>
          <optgroup label="Freelance platform">
            {FREELANCE_INDUSTRY_CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name} — {PRICING_TIER_META[cat.tier].label}
              </option>
            ))}
          </optgroup>
          <optgroup label="SMB verticals (legacy)">
            {LEGACY_SMB_INDUSTRY_CATEGORIES.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name} — {PRICING_TIER_META[cat.tier].label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      {industryCategory && (
        <label className="mt-3 block text-sm">
          <span className="text-slate-400">
            Sub-industry {loading ? '(loading…)' : subIndustries.length ? '' : '(general)'}
          </span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={verticalSlug}
            disabled={!subIndustries.length}
            onChange={(e) => onChange({ industryCategory, verticalSlug: e.target.value })}
          >
            <option value="">All sub-industries in {selected?.name ?? industryCategory}</option>
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
          Pricing tier: <span className="text-violet-300">{PRICING_TIER_META[tier].label}</span>
          {selectedSub ? (
            <>
              {' '}
              · Delivery for: <span className="text-violet-300">{selectedSub.name}</span>
            </>
          ) : null}
          {!selectedSub && <> — {TIER_DESCRIPTION_EN[tier]}</>}
        </p>
      )}
    </div>
  );
}
