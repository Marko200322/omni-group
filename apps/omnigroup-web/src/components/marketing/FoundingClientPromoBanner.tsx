'use client';

import {
  getFoundingClientDiscountPct,
  getFoundingClientLockMonths,
  getFoundingClientMaxSlots,
  getFoundingClientPlanQuote,
  isFoundingClientPromoEnabled,
} from '@/lib/founding-client-promo';
import { formatEur } from '@/lib/category-pricing';
import { isRegulatedIndustryCategory } from '@/lib/regulated-founding-partner';

type Props = {
  industryCategory?: string;
};

export function FoundingClientPromoBanner({ industryCategory }: Props) {
  if (!isFoundingClientPromoEnabled()) return null;

  const maxSlots = getFoundingClientMaxSlots();
  const lockMonths = getFoundingClientLockMonths();
  const discountPct = getFoundingClientDiscountPct();
  const regulated = Boolean(industryCategory && isRegulatedIndustryCategory(industryCategory));
  const quote =
    industryCategory && !regulated
      ? getFoundingClientPlanQuote('pro', industryCategory)
      : getFoundingClientPlanQuote('pro', null);

  if (!quote.active && !regulated) return null;

  return (
    <section
      id="founding-client-promo"
      className="mt-8 rounded-2xl border border-emerald-500/35 bg-gradient-to-br from-emerald-500/10 to-violet-500/5 p-5 md:p-6"
      aria-label="Founding client promotion"
    >
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Founding client promo</p>
      {regulated ? (
        <p className="mt-2 text-sm text-slate-300">
          Subscription founding discount applies to non-regulated industries. Your category uses{' '}
          <strong className="text-white">regulated founding partner</strong> pricing below.
        </p>
      ) : industryCategory && quote.active ? (
        <>
          <p className="mt-2 font-display text-xl font-bold text-white">
            Growth from {formatEur(quote.foundingEur)}/mo
            <span className="ml-2 text-base font-normal text-slate-400 line-through">
              {formatEur(quote.listEur)}
            </span>
          </p>
          <p className="mt-1 text-sm text-emerald-200/90">
            {quote.discountPct}% off list — locked {lockMonths} mo, {maxSlots} slots total.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-xl font-bold text-white">
            {discountPct}% off Growth subscription
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Example: Growth from {formatEur(quote.foundingEur)}/mo (was {formatEur(quote.listEur)}).{' '}
            {maxSlots} founding slots — select your industry below for your exact rate.
          </p>
        </>
      )}
    </section>
  );
}
