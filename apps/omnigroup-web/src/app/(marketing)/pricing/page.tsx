'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Calculator, Sparkles } from 'lucide-react';
import { IndustryVerticalSelect } from '@/components/marketing/IndustryVerticalSelect';
import { formatEur } from '@/lib/category-pricing';
import {
  DELIVERABLE_CATALOG,
  type DeliverableDefinition,
} from '@/lib/deliverable-catalog';
import {
  calculateDeliverableQuote,
  formatBillingLabel,
  quoteAllDeliverables,
  type PaymentProviderId,
  type QuoteBreakdown,
} from '@/lib/dynamic-pricing';
import { getCategoryMarketIndex } from '@/lib/market-pricing';
import { getIndustryCategory } from '@/lib/category-pricing';
import { buildLoginNextForQuote } from '@/lib/checkout-navigation';
import {
  canCheckoutPackage,
  getPackageAvailability,
  getPackageDeliverySpec,
  resolvePackageOffer,
  listCheckoutPackages,
} from '@/lib/package-delivery-spec';
import { getFactoryPhase, getFactoryPhaseLabel, usesFixedPhasePricing } from '@/lib/factory-phase';
import { isLeanProdMode } from '@/lib/prod-mode';
import { getMonthlyBudgetEur } from '@/lib/prod-budget';
import { getSellablePackageHint } from '@/lib/sellable-packages';

const DELIVERABLE_CATEGORY_LABELS_EN: Record<DeliverableDefinition['category'], string> = {
  implementation: 'Implementation',
  consulting: 'Consulting',
  retainer: 'Monthly retainer',
  growth: 'Growth & marketing',
  vertical: 'Vertical solutions',
};

function formatMarketIndexLabelEn(index: number): string {
  if (index >= 1.25) return 'Premium market';
  if (index >= 1.05) return 'Above average';
  if (index >= 0.95) return 'Average market';
  return 'Budget segment';
}

const PAYMENT_OPTIONS: { id: PaymentProviderId; label: string }[] = [
  { id: 'manual', label: 'Bank transfer (no fee)' },
  { id: 'kriptoman', label: 'Kriptoman (~1.5%)' },
  { id: 'stripe', label: 'Stripe (~2.9% + €0.25)' },
  { id: 'paypal', label: 'PayPal (~3.4%)' },
];

function availabilityBadgeClass(tone: ReturnType<typeof getPackageAvailability>['badgeTone']): string {
  switch (tone) {
    case 'available':
      return 'bg-emerald-500/20 text-emerald-200';
    case 'upcoming':
      return 'bg-amber-500/20 text-amber-200';
    default:
      return 'bg-slate-500/25 text-slate-300';
  }
}

function availabilityCardBorder(tone: ReturnType<typeof getPackageAvailability>['badgeTone']): string {
  switch (tone) {
    case 'available':
      return 'border-emerald-500/25';
    case 'upcoming':
      return 'border-amber-500/20';
    default:
      return 'border-white/10';
  }
}

function QuoteCard({
  item,
  quote,
  industryCategory,
  verticalSlug,
}: {
  item: DeliverableDefinition;
  quote: QuoteBreakdown;
  industryCategory: string;
  verticalSlug: string;
}) {
  const [open, setOpen] = useState(false);
  const buyHref = buildLoginNextForQuote({
    service: item.id,
    category: industryCategory || undefined,
    vertical: verticalSlug || undefined,
  });
  const spec = getPackageDeliverySpec(item.id);
  const offer = resolvePackageOffer(item.id);
  const availability = getPackageAvailability(item.id);
  const checkoutOk = availability.checkoutAllowed;
  return (
    <motion.div
      layout
      id={`deliverable-${item.id}`}
      className={`flex flex-col rounded-2xl border bg-white/[0.03] p-6 ${availabilityCardBorder(availability.badgeTone)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-violet-300/80">
          {DELIVERABLE_CATEGORY_LABELS_EN[item.category]}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${availabilityBadgeClass(availability.badgeTone)}`}
        >
          {availability.badge}
        </span>
      </div>
      <h3 className="mt-1 font-display text-lg font-semibold text-white">{item.name}</h3>
      <p className="mt-2 flex-1 text-sm text-slate-400">{item.description}</p>
      {spec && (
        <div className="mt-3 space-y-2 text-xs">
          <p className="font-medium text-emerald-300/90">You receive (automated)</p>
          <ul className="list-inside list-disc text-slate-500">
            {offer.includes.slice(0, 5).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {offer.upcomingUnlocks.length > 0 && (
            <>
              <p className="font-medium text-violet-300/80">Auto-added as factory grows</p>
              <ul className="list-inside list-disc text-slate-600">
                {offer.upcomingUnlocks.slice(0, 3).map((u) => (
                  <li key={u.fromPhase + u.includes[0]}>
                    {u.fromPhase}: {u.includes[0]}
                  </li>
                ))}
              </ul>
            </>
          )}
          {spec.excludes.length > 0 && (
            <>
              <p className="font-medium text-amber-300/80">Not included</p>
              <ul className="list-inside list-disc text-slate-600">
                {spec.excludes.slice(0, 2).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <p className="mt-4">
        <span className="text-3xl font-bold text-gradient">{formatEur(quote.clientPriceEur)}</span>
        <span className="text-sm text-slate-500"> {formatBillingLabel(item.billing)}</span>
      </p>
      {quote.clientPriceYearlyEur && item.billing === 'monthly' && (
        <p className="text-xs text-slate-500">Yearly: {formatEur(quote.clientPriceYearlyEur)}</p>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="mt-3 text-left text-xs text-violet-300 underline-offset-2 hover:underline"
      >
        {open ? 'Hide breakdown' : 'How was this calculated?'}
      </button>
      {open && (
        <ul className="mt-3 space-y-1 rounded-lg border border-white/5 bg-black/20 p-3 font-mono text-[11px] text-slate-400">
          <li>Market (TAM/competition): {formatEur(quote.marketValueEur)}</li>
          <li>Resource cost (AI, scraper, infra): {formatEur(quote.resourceCostEur)}</li>
          <li>Margin: {formatEur(quote.marginEur)}</li>
          <li>Fee {quote.paymentProvider}: {formatEur(quote.paymentFeeEur)}</li>
          <li>Industry: {quote.pricingTier} · market ×{quote.factors.categoryMarketIndex.toFixed(2)}</li>
        </ul>
      )}
      <div className="mt-4 flex flex-col gap-2">
        {checkoutOk ? (
          <Link href={buyHref} className="btn-primary block text-center text-sm">
            Buy now
          </Link>
        ) : (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200">
            {availability.statusLabel}
          </p>
        )}
        <Link
          href={`/contact?service=${item.id}${industryCategory ? `&category=${industryCategory}` : ''}`}
          className="btn-glass block text-center text-sm"
        >
          {checkoutOk ? 'Ask before buying' : 'Request quote'}
        </Link>
      </div>
    </motion.div>
  );
}

export default function PricingPage() {
  const [industryCategory, setIndustryCategory] = useState('');
  const [verticalSlug, setVerticalSlug] = useState('');
  const [paymentProvider, setPaymentProvider] = useState<PaymentProviderId>('manual');
  const [intensity, setIntensity] = useState(55);
  const [liveQuotes, setLiveQuotes] = useState<QuoteBreakdown[] | null>(null);

  const localQuotes = useMemo(
    () =>
      quoteAllDeliverables({
        industryCategory: industryCategory || null,
        verticalSlug: verticalSlug || null,
        paymentProvider,
        marketIntensity: intensity,
        tamEstimateUsd: 50_000 + intensity * 1200,
        competitionScore: Math.min(100, 30 + Math.round(intensity / 2)),
      }),
    [industryCategory, verticalSlug, paymentProvider, intensity],
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (industryCategory) params.set('industryCategory', industryCategory);
    if (verticalSlug) params.set('verticalSlug', verticalSlug);
    params.set('paymentProvider', paymentProvider);
    params.set('marketIntensity', String(intensity));
    params.set('tamEstimateUsd', String(50_000 + intensity * 1200));
    params.set('competitionScore', String(Math.min(100, 30 + Math.round(intensity / 2))));
    let cancelled = false;
    void fetch(`/api/atina/billing/quotes?${params}`)
      .then((r) => r.json())
      .then((json: { ok?: boolean; data?: { quotes?: QuoteBreakdown[] } }) => {
        if (!cancelled && json.ok && json.data?.quotes?.length) {
          setLiveQuotes(json.data.quotes);
        }
      })
      .catch(() => {
        if (!cancelled) setLiveQuotes(null);
      });
    return () => {
      cancelled = true;
    };
  }, [industryCategory, verticalSlug, paymentProvider, intensity]);

  const quotes = liveQuotes ?? localQuotes;

  const quoteById = useMemo(() => new Map(quotes.map((q) => [q.deliverableId, q])), [quotes]);
  const marketIndex = industryCategory ? getCategoryMarketIndex(industryCategory) : 1;
  const categoryMeta = industryCategory ? getIndustryCategory(industryCategory) : null;

  const verticalQuote = calculateDeliverableQuote({
    deliverableId: 'vertical-package',
    industryCategory: industryCategory || null,
    verticalSlug: verticalSlug || null,
    paymentProvider,
    marketIntensity: intensity,
    tamEstimateUsd: 50_000 + intensity * 1200,
    competitionScore: Math.min(100, 30 + Math.round(intensity / 2)),
  });
  const verticalAvailability = getPackageAvailability('vertical-package');

  const catalogItems = useMemo(
    () => DELIVERABLE_CATALOG.filter((d) => d.id !== 'vertical-package'),
    [],
  );
  const { availableNow, comingSoon } = useMemo(() => {
    const available: DeliverableDefinition[] = [];
    const upcoming: DeliverableDefinition[] = [];
    for (const item of catalogItems) {
      if (canCheckoutPackage(item.id)) available.push(item);
      else upcoming.push(item);
    }
    return { availableNow: available, comingSoon: upcoming };
  }, [catalogItems]);
  const checkoutPackageIds = useMemo(() => listCheckoutPackages(), []);

  useEffect(() => {
    const highlightService = new URLSearchParams(window.location.search).get('service') ?? '';
    if (!highlightService) return;
    const el = document.getElementById(`deliverable-${highlightService}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-violet-400/60');
      const timer = window.setTimeout(() => {
        el.classList.remove('ring-2', 'ring-violet-400/60');
      }, 2500);
      return () => window.clearTimeout(timer);
    }
  }, [quotes.length]);

  return (
    <div className="px-4 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-300">Delivery pricing</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gradient md:text-5xl">
            Transparent pricing by industry
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Honest delivery scope per package — automated outputs listed on each card.
            <span className="mt-2 block text-violet-200/90">
              Factory {getFactoryPhase()}: {getFactoryPhaseLabel()}
              {usesFixedPhasePricing() && ' · Fixed launch prices until M6.'}
            </span>
            {isLeanProdMode() && (
              <span className="mt-2 block text-amber-200/90">
                €{getMonthlyBudgetEur()}/mo budget (excl. VPS/domain): {getSellablePackageHint()}
              </span>
            )}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2"
        >
          <IndustryVerticalSelect
            industryCategory={industryCategory}
            verticalSlug={verticalSlug}
            onChange={({ industryCategory: cat, verticalSlug: vert }) => {
              setIndustryCategory(cat);
              setVerticalSlug(vert);
            }}
          />
          <label className="block text-sm">
            <span className="text-slate-400">Client payment method</span>
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              value={paymentProvider}
              onChange={(e) => setPaymentProvider(e.target.value as PaymentProviderId)}
            >
              {PAYMENT_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          {categoryMeta && (
            <p className="rounded-xl border border-violet-500/25 bg-violet-500/5 px-4 py-3 text-sm text-slate-300 sm:col-span-2">
              <strong className="text-white">{categoryMeta.name}</strong> — {formatMarketIndexLabelEn(marketIndex)}{' '}
              <span className="text-slate-500">(index ×{marketIndex.toFixed(2)})</span>
            </p>
          )}
          <label className="block text-sm sm:col-span-2">
            <span className="text-slate-400">Niche competitiveness — {intensity}</span>
            <input
              type="range"
              min={10}
              max={100}
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="mt-2 w-full accent-violet-500"
            />
          </label>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`mt-10 rounded-2xl border p-6 ${
            verticalAvailability.checkoutAllowed
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-amber-500/25 bg-amber-500/5'
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Calculator className="mt-1 h-6 w-6 text-emerald-400" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-semibold text-white">Vertical package (monthly)</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${availabilityBadgeClass(verticalAvailability.badgeTone)}`}
                  >
                    {verticalAvailability.badge}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                  Typical monthly delivery by industry — CRM, automations, AI support.
                </p>
                {!verticalAvailability.checkoutAllowed && (
                  <p className="mt-2 text-xs text-amber-200/90">{verticalAvailability.statusLabel}</p>
                )}
                <p className="mt-3 text-3xl font-bold text-emerald-300">
                  {formatEur(verticalQuote.clientPriceEur)}
                  <span className="text-base font-normal text-slate-500"> / mo</span>
                </p>
              </div>
            </div>
            {verticalAvailability.checkoutAllowed ? (
              <Link
                href={buildLoginNextForQuote({
                  service: 'vertical-package',
                  category: industryCategory || undefined,
                  vertical: verticalSlug || undefined,
                })}
                className="btn-primary text-sm"
              >
                Buy now
              </Link>
            ) : (
              <Link
                href={`/contact?service=vertical-package${industryCategory ? `&category=${industryCategory}` : ''}`}
                className="btn-glass text-sm"
              >
                Request quote
              </Link>
            )}
          </div>
        </motion.div>

        <section className="mt-14">
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-white">Available now</h2>
            <p className="mt-1 text-sm text-slate-400">
              Self-serve checkout — automated delivery after payment ({checkoutPackageIds.length} packages at factory{' '}
              {getFactoryPhase()}).
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {availableNow.map((item, i) => {
              const quote = quoteById.get(item.id);
              if (!quote) return null;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <QuoteCard
                    item={item}
                    quote={quote}
                    industryCategory={industryCategory}
                    verticalSlug={verticalSlug}
                  />
                </motion.div>
              );
            })}
          </div>
        </section>

        {comingSoon.length > 0 && (
          <section className="mt-16">
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-white">Coming with factory growth</h2>
              <p className="mt-1 text-sm text-slate-400">
                Listed for transparency — opens as factory phase advances. Request a quote if you need it early.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {comingSoon.map((item, i) => {
                const quote = quoteById.get(item.id);
                if (!quote) return null;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <QuoteCard
                      item={item}
                      quote={quote}
                      industryCategory={industryCategory}
                      verticalSlug={verticalSlug}
                    />
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center text-xs text-slate-500"
        >
          <Sparkles className="mx-auto mb-2 h-3.5 w-3.5 text-violet-400" />
          All prices are indicative — synced with the live billing engine when API is available.
          <Link href="/dashboard#quote" className="mt-2 block text-violet-300 underline-offset-2 hover:underline">
            Open checkout in dashboard
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
