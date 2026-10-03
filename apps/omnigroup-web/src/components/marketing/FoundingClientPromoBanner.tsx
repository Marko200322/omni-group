'use client';

import { formatPlanMoney, getSaaSPlanPrice } from '@/lib/saas-plans';
import {
  foundingDiscountedAmount,
  getFoundingClientDiscountPct,
  getFoundingClientLockMonths,
  getFoundingClientMaxSlots,
  isFoundingClientPromoEnabled,
} from '@/lib/founding-client-promo';
import { isRegulatedIndustryCategory } from '@/lib/regulated-founding-partner';
import { useFoundingPromoStatus } from '@/hooks/useFoundingPromoStatus';

type Props = {
  industryCategory?: string;
  currency?: 'EUR' | 'USD';
};

export function FoundingClientPromoBanner({ industryCategory, currency = 'USD' }: Props) {
  const { status } = useFoundingPromoStatus();
  const buildOn = isFoundingClientPromoEnabled();
  if (status ? !status.enabled : !buildOn) return null;

  const maxSlots = status?.maxSlots ?? getFoundingClientMaxSlots();
  const lockMonths = status?.lockMonths ?? getFoundingClientLockMonths();
  const discountPct = status?.discountPct ?? getFoundingClientDiscountPct();
  const remaining = status?.remaining;
  const soldOut = status?.active === false && status?.enabled === true;
  const regulated = Boolean(industryCategory && isRegulatedIndustryCategory(industryCategory));
  const list = getSaaSPlanPrice('pro', 'monthly', currency);
  const founding = foundingDiscountedAmount(list, discountPct);

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
      ) : soldOut ? (
        <>
          <p className="mt-2 font-display text-xl font-bold text-white">Founding slots are full</p>
          <p className="mt-1 text-sm text-slate-400">
            Checkout now uses the published list: Launch, Growth, and Scale.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 font-display text-xl font-bold text-white">
            {discountPct}% off for the first {lockMonths} months
          </p>
          <p className="mt-1 text-sm text-slate-300">
            Growth is {formatPlanMoney(founding, currency)}/mo for {lockMonths} months, then the list{' '}
            {formatPlanMoney(list, currency)}/mo. Same for Launch and Scale. Yearly is {discountPct}% off the first
            year, then list.
          </p>
          <p className="mt-2 text-sm text-emerald-200/90">
            {typeof remaining === 'number'
              ? `${remaining} of ${maxSlots} founding slots left.`
              : `${maxSlots} founding slots total.`}
          </p>
        </>
      )}
    </section>
  );
}
