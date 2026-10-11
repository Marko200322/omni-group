'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { OfferCard } from '@/components/marketing/OfferCard';
import { IndustryCategorySelect } from '@/components/marketing/IndustryCategorySelect';
import { RegulatedFoundingPartnerPanel } from '@/components/marketing/RegulatedFoundingPartnerPanel';
import { LaunchBundlesPanel } from '@/components/marketing/LaunchBundlesPanel';
import { SaaSPlanPricing } from '@/components/marketing/SaaSPlanPricing';
import { FoundingClientPromoBanner } from '@/components/marketing/FoundingClientPromoBanner';
import { DeliverableIntroPromoBanner } from '@/components/marketing/DeliverableIntroPromoBanner';
import { PublicCatalogOverview } from '@/components/marketing/PublicCatalogOverview';
import { IndustryBrowseGrid } from '@/components/marketing/IndustryBrowseGrid';
import { PricingClarityFaq } from '@/components/marketing/PricingClarityFaq';
import { isRegulatedIndustryCategory } from '@/lib/regulated-founding-partner';
import { getClientOffer, getPublicCatalogStats, listClientOffers } from '@/lib/public-catalog';
import { getIndustryCategory } from '@/lib/category-pricing';
import { useIndustryPackageMatrix } from '@/hooks/useIndustryPackageMatrix';
import type { BillingCurrency } from '@/lib/saas-plans';

export default function PricingPage() {
  const [industryCategory, setIndustryCategory] = useState('');
  const { matrix: industryMatrix, packageCount: matrixCount } = useIndustryPackageMatrix(industryCategory);
  const [showAdjust, setShowAdjust] = useState(false);
  const [currency, setCurrency] = useState<BillingCurrency>('USD');

  const { available, later } = useMemo(
    () =>
      listClientOffers({
        category: industryCategory || undefined,
        industryMatrix: industryCategory ? industryMatrix : undefined,
        excludeBundles: true,
      }),
    [industryCategory, industryMatrix],
  );

  const categoryMeta = industryCategory ? getIndustryCategory(industryCategory) : null;
  const catalogStats = getPublicCatalogStats();

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
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Transparent pricing</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            Platform subscription + fixed-scope delivery
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            One workspace for CRM, workflows, delivery, billing, documents, and AI support. Add expert packages only
            when you need them — every card states scope, timeline, what ships, and what is not included.
          </p>
        </motion.div>

        <FoundingClientPromoBanner industryCategory={industryCategory} currency={currency} />
        <SaaSPlanPricing currency={currency} onCurrencyChange={setCurrency} />

        <section className="mt-20 border-t border-white/10 pt-16">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">Expert delivery catalog</p>
          <h2 className="mt-2 font-display text-3xl font-bold text-white">
            {catalogStats.basePackages} capabilities × {catalogStats.industryGroups} industries
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
            Optional fixed-scope packages on one price book. Bundles appear once below — not a second catalog.
            Without an industry filter you see the {catalogStats.basePackages} base capabilities; with a filter you
            see that industry&apos;s full set.
          </p>
          <div className="mt-6">
            <PublicCatalogOverview compact ctaHref="/products" ctaLabel="Open full industry directory" />
          </div>
          <DeliverableIntroPromoBanner />
        </section>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 space-y-6">
          <div className="max-w-md space-y-3">
            <IndustryCategorySelect
              value={industryCategory}
              onChange={setIndustryCategory}
              emptyLabel="All industries — show base capabilities"
              label="Filter packages by industry"
            />
            {categoryMeta && (
              <p className="text-sm text-slate-400">
                Showing packages for <strong className="text-white">{categoryMeta.name}</strong>
                {matrixCount > 0 ? (
                  <span className="text-slate-500">
                    {' '}
                    — {matrixCount} tailored (problems, extras, competitive price)
                  </span>
                ) : null}
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
                SaaS subscription prices are fixed by currency and do not change by industry. Expert-service prices can
                adjust for scope and regulated-industry requirements. Cards show regular list; intro discount (if
                active) applies at checkout for the first package clients only. Payment methods after sign-in depend on
                what is enabled for your account. Want something custom?{' '}
                <Link href="/contact" className="text-violet-300 underline-offset-2 hover:underline">
                  Contact us
                </Link>
                .
              </p>
            )}
          </div>
          <IndustryBrowseGrid value={industryCategory} onChange={setIndustryCategory} />
        </motion.div>

        <LaunchBundlesPanel />

        {industryCategory && isRegulatedIndustryCategory(industryCategory) && (
          <RegulatedFoundingPartnerPanel industryCategory={industryCategory} />
        )}

        <section className="mt-14">
          <h2 className="font-display text-2xl font-bold text-white">Ready to buy</h2>
          <p className="mt-1 text-sm text-slate-400">
            Clear scope. Delivery starts after payment confirmation — each card says what ships
            automatically and what still needs a person.
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
                    offer={
                      getClientOffer(offer.id, {
                        category: industryCategory || undefined,
                        industryRow: industryCategory ? industryMatrix.get(offer.id) ?? null : null,
                      }) ?? offer
                    }
                    id={`offer-${offer.id}`}
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
                    offer={
                      getClientOffer(offer.id, {
                        category: industryCategory || undefined,
                        industryRow: industryCategory ? industryMatrix.get(offer.id) ?? null : null,
                      }) ?? offer
                    }
                    id={`offer-${offer.id}`}
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

        <PricingClarityFaq />

        <p className="mt-14 text-center text-sm text-slate-500">
          Already a client?{' '}
          <Link href="/dashboard/order" className="text-violet-300 underline-offset-2 hover:underline">
            Open checkout in your dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
