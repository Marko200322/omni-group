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
  const buyHref = `/login?next=${encodeURIComponent(
    `/dashboard#quote?service=${item.id}${industryCategory ? `&category=${industryCategory}` : ''}${verticalSlug ? `&vertical=${verticalSlug}` : ''}`,
  )}`;
  return (
    <motion.div
      layout
      id={`deliverable-${item.id}`}
      className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <p className="text-xs uppercase tracking-wider text-violet-300/80">
        {DELIVERABLE_CATEGORY_LABELS_EN[item.category]}
      </p>
      <h3 className="mt-1 font-display text-lg font-semibold text-white">{item.name}</h3>
      <p className="mt-2 flex-1 text-sm text-slate-400">{item.description}</p>
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
        <Link href={buyHref} className="btn-primary block text-center text-sm">
          Buy now
        </Link>
        <Link
          href={`/contact?service=${item.id}${industryCategory ? `&category=${industryCategory}` : ''}`}
          className="btn-glass block text-center text-sm"
        >
          Ask before buying
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
            Delivery pricing tailored to your vertical and market — from quick setup to full custom software.
            Select a category to see realistic indicative quotes.
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
          className="mt-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6"
        >
          <div className="flex items-start gap-3">
            <Calculator className="mt-1 h-6 w-6 text-emerald-400" />
            <div>
              <p className="font-display text-lg font-semibold text-white">Vertical package (monthly)</p>
              <p className="mt-1 text-sm text-slate-400">
                Typical monthly delivery by industry — CRM, automations, AI support.
              </p>
              <p className="mt-3 text-3xl font-bold text-emerald-300">
                {formatEur(verticalQuote.clientPriceEur)}
                <span className="text-base font-normal text-slate-500"> / mo</span>
              </p>
            </div>
          </div>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DELIVERABLE_CATALOG.filter((d) => d.id !== 'vertical-package').map((item, i) => {
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
