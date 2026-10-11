'use client';

import { useEffect, useState } from 'react';
import {
  fetchDeliverableIntroPromoStatus,
  type DeliverableIntroPromoPublic,
} from '@/lib/deliverable-intro-promo-public';

/** Site-wide notice: first-50 package intro vs regular list after slots fill. */
export function DeliverableIntroPromoBanner() {
  const [promo, setPromo] = useState<DeliverableIntroPromoPublic | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchDeliverableIntroPromoStatus().then((p) => {
      if (!cancelled) setPromo(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!promo?.enabled) return null;

  if (!promo.active) {
    return (
      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-slate-300">
        <p className="font-medium text-white">Package prices are at regular list</p>
        <p className="mt-1 text-slate-400">
          The first-{promo.maxSlots} intro window is closed. Checkout charges the full M6 list price shown on each
          card.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-50">
      <p className="font-semibold text-amber-100">First {promo.maxSlots} package clients — intro pricing</p>
      <p className="mt-1 text-amber-100/85">
        Cards show the <span className="font-semibold text-white">regular</span> list price. At checkout you pay{' '}
        <span className="font-semibold text-white">−{promo.discountPct}%</span> while intro slots remain (
        {promo.remaining} of {promo.maxSlots} left). After that, everyone pays the full regular price.
      </p>
    </div>
  );
}
