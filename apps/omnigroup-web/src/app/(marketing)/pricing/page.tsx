'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { OfferCard } from '@/components/marketing/OfferCard';
import { IndustryCategorySelect } from '@/components/marketing/IndustryCategorySelect';
import { RegulatedFoundingPartnerPanel } from '@/components/marketing/RegulatedFoundingPartnerPanel';
import { FoundingClientPromoBanner } from '@/components/marketing/FoundingClientPromoBanner';
import { LaunchBundlesPanel } from '@/components/marketing/LaunchBundlesPanel';
import { isRegulatedIndustryCategory } from '@/lib/regulated-founding-partner';
import { getFoundingClientPlanQuote, isFoundingClientPromoEnabled } from '@/lib/founding-client-promo';
import { formatEur } from '@/lib/category-pricing';
import { getClientOffer, listClientOffers } from '@/lib/client-offers';
import { calculateDeliverableQuote, type PaymentProviderId } from '@/lib/dynamic-pricing';
import { getIndustryCategory } from '@/lib/category-pricing';
import { listCheckoutPackages } from '@/lib/package-delivery-spec';

export default function PricingPage() {
  const [industryCategory, setIndustryCategory] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);
  const [paymentProvider] = useState<PaymentProviderId>('manual');
  const intensity = 55;

  const { available, later } = useMemo(
    () => listClientOffers({ category: industryCategory || undefined }),
    [industryCategory],
  );

  const quotePriceById = useMemo(() => {
    const map = new Map<string, number>();
    for (const offer of [...available, ...later]) {
      const q = calculateDeliverableQuote({
        deliverableId: offer.id,
        industryCategory: industryCategory || null,
        paymentProvider,
        marketIntensity: intensity,
        tamEstimateUsd: 50_000 + intensity * 1200,
        competitionScore: Math.min(100, 30 + Math.round(intensity / 2)),
      });
      map.set(offer.id, q.clientPriceEur);
    }
    return map;
  }, [available, later, industryCategory, paymentProvider, intensity]);

  const categoryMeta = industryCategory ? getIndustryCategory(industryCategory) : null;
  const readyCount = listCheckoutPackages().length;
  const foundingPromo = isFoundingClientPromoEnabled();
  const growthFounding =
    industryCategory && !isRegulatedIndustryCategory(industryCategory)
      ? getFoundingClientPlanQuote('pro', industryCategory)
      : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const service = params.get('service') ?? '';
    const plan = params.get('plan') ?? '';

    if (plan === 'enterprise') {
      const enterprise = document.getElementById('enterprise-inquiry');
      if (enterprise) {
        enterprise.scrollIntoView({ behavior: 'smooth', block: 'center' });
        enterprise.classList.add('ring-2', 'ring-violet-400/60');
        const t = window.setTimeout(() => enterprise.classList.remove('ring-2', 'ring-violet-400/60'), 2500);
        return () => window.clearTimeout(t);
      }
    }

    if (!service) return;
    const el = document.getElementById(`offer-${service}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-violet-400/60');
    const t = window.setTimeout(() => el.classList.remove('ring-2', 'ring-violet-400/60'), 2500);
    return () => window.clearTimeout(t);
  }, [available.length, later.length]);

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Packages</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            Buy what is ready today
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Each package shows exactly what you get, what is not included, and when it arrives.
            {readyCount > 0 ? (
              <span className="mt-2 block text-emerald-200/90">
                {readyCount} packages open for purchase right now.
              </span>
            ) : (
              <span className="mt-2 block text-amber-200/90">
                No self-serve packages are open — contact us for a quote.
              </span>
            )}
          </p>
        </motion.div>

        <FoundingClientPromoBanner industryCategory={industryCategory} />

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 max-w-md space-y-3">
          <IndustryCategorySelect value={industryCategory} onChange={setIndustryCategory} />
          {categoryMeta && (
            <p className="text-sm text-slate-400">
              Pricing for <strong className="text-white">{categoryMeta.name}</strong>
            </p>
          )}
          <button
            type="button"
            className="text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
            onClick={() => setShowAdjust((v) => !v)}
          >
            {showAdjust ? 'Hide note' : 'How pricing works'}
          </button>
          {showAdjust && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
              Subscription plans start from {formatEur(39)}/mo (industry-adjusted). Package prices are fixed anchors
              for launch SKUs. Industry can adjust quotes slightly. Payment is bank transfer or Stripe after sign-in.
              {foundingPromo && growthFounding?.active ? (
                <span className="mt-2 block text-emerald-200/90">
                  Founding client promo: Growth from {formatEur(growthFounding.foundingEur)}/mo (
                  {growthFounding.discountPct}% off list).
                </span>
              ) : null}{' '}
              Want something custom?{' '}
              <Link href="/contact" className="text-violet-300 underline-offset-2 hover:underline">
                Contact us
              </Link>
              .
            </p>
          )}
        </motion.div>

        <LaunchBundlesPanel />

        {industryCategory && isRegulatedIndustryCategory(industryCategory) && (
          <RegulatedFoundingPartnerPanel industryCategory={industryCategory} />
        )}

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-white">Ready to buy</h2>
          <p className="mt-1 text-sm text-slate-400">
            Clear scope. Automated delivery after payment confirmation.
          </p>
          {available.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6 text-amber-100">
              Nothing is on self-serve checkout right now.{" "}
              <Link href="/contact" className="underline underline-offset-2">
                Request a quote
              </Link>
              .
            </p>
          ) : (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {available.map((offer, i) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <OfferCard
                    offer={getClientOffer(offer.id, { category: industryCategory || undefined }) ?? offer}
                    id={`offer-${offer.id}`}
                    priceOverrideEur={quotePriceById.get(offer.id)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {later.length > 0 && (
          <section className="mt-20">
            <h2 className="font-display text-2xl font-bold text-white">Currently under construction</h2>
            <p className="mt-1 text-sm text-slate-400">
              These packages are not for sale yet. When the factory reaches their phase, checkout opens and automated delivery turns on — the site updates with the same catalog.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {later.map((offer, i) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.03 }}
                >
                  <OfferCard
                    offer={getClientOffer(offer.id, { category: industryCategory || undefined }) ?? offer}
                    id={`offer-${offer.id}`}
                    priceOverrideEur={quotePriceById.get(offer.id)}
                    compact
                  />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        <section
          id="enterprise-inquiry"
          className="mt-20 scroll-mt-24 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-8 md:p-10"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Enterprise &amp; custom</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white">Need a tailored scope or Partner plan?</h2>
          <p className="mt-3 max-w-2xl text-sm text-slate-400">
            Multi-site rollouts, dedicated support, AI memory, and custom SLAs are sold via quote — not self-serve
            checkout. Tell us what you need and we&apos;ll send a proposal.
          </p>
          <Link href="/contact" className="btn-primary mt-6 inline-block text-sm">
            Request enterprise quote
          </Link>
        </section>

        <p className="mt-14 text-center text-sm text-slate-500">
          Already a client?{' '}
          <Link href="/dashboard#quote" className="text-violet-300 underline-offset-2 hover:underline">
            Open checkout in your dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
