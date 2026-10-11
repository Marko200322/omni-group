'use client';

import { INDUSTRY_CATEGORIES, PRICING_TIER_META } from '@/lib/category-pricing';
import { categoryLabel, tierLabel } from '@/lib/display-text';

type Props = {
  value: string;
  onChange: (slug: string) => void;
  /** Max chips before “show all” (default: show all 50) */
  limit?: number;
};

/** Clickable industry directory — professional browse, not a 1000-card dump. */
export function IndustryBrowseGrid({ value, onChange, limit }: Props) {
  const cats = limit && limit > 0 ? INDUSTRY_CATEGORIES.slice(0, limit) : INDUSTRY_CATEGORIES;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {INDUSTRY_CATEGORIES.length} industries — select one
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {cats.map((cat) => {
          const active = value === cat.slug;
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => onChange(active ? '' : cat.slug)}
              className={
                active
                  ? 'rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1.5 text-left text-sm text-emerald-100'
                  : 'rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-left text-sm text-slate-300 transition hover:border-white/25 hover:bg-white/[0.06] hover:text-white'
              }
              aria-pressed={active}
            >
              <span className="font-medium">{categoryLabel(cat)}</span>
              <span className="ml-1.5 text-[10px] uppercase tracking-wide text-slate-500">
                {tierLabel(PRICING_TIER_META[cat.tier])}
              </span>
            </button>
          );
        })}
      </div>
      {limit && limit < INDUSTRY_CATEGORIES.length ? (
        <p className="mt-2 text-xs text-slate-500">
          Showing {limit} of {INDUSTRY_CATEGORIES.length} — use the dropdown for the full list.
        </p>
      ) : null}
    </div>
  );
}
