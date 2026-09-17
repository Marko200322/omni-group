'use client';

import {
  INDUSTRY_CATEGORIES,
  PRICING_TIER_META,
  getIndustryCategory,
  resolvePricingTier,
} from '@/lib/category-pricing';
import { categoryLabel, tierLabel } from '@/lib/display-text';
import { CHECKOUT_SELECT_CLASS } from '@/lib/checkout-select-class';

type Props = {
  value: string;
  onChange: (slug: string) => void;
  className?: string;
  showTierHint?: boolean;
};

export function IndustryCategorySelect({ value, onChange, className, showTierHint = true }: Props) {
  const selected = getIndustryCategory(value);
  const tier = resolvePricingTier(value);

  return (
    <div className={className}>
      <label className="block text-sm">
        <span className="text-slate-400">Industry category</span>
        <select
          className={CHECKOUT_SELECT_CLASS}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Standard (typical SMB)</option>
          {INDUSTRY_CATEGORIES.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {categoryLabel(cat)} — {tierLabel(PRICING_TIER_META[cat.tier])}
            </option>
          ))}
        </select>
      </label>
      {showTierHint && selected && (
        <p className="mt-2 text-xs text-slate-500">
          Pricing tier: <span className="text-violet-300">{tierLabel(PRICING_TIER_META[tier])}</span> —{' '}
          {PRICING_TIER_META[tier].description}
        </p>
      )}
    </div>
  );
}
