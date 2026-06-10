'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { IndustryCategorySelect } from '@/components/marketing/IndustryCategorySelect';
import { formatEur } from '@/lib/category-pricing';
import { DELIVERABLE_CATALOG } from '@/lib/deliverable-catalog';
import {
  calculateDeliverableQuote,
  formatBillingLabel,
  type PaymentProviderId,
} from '@/lib/dynamic-pricing';

type ManualCheckout = {
  paymentId: string;
  reference: string;
  amount: number;
  currency: string;
  instructions: Record<string, string>;
};

type Props = {
  disabled?: boolean;
};

const PAYMENT_OPTIONS: { id: PaymentProviderId; label: string }[] = [
  { id: 'manual', label: 'Banka' },
  { id: 'kriptoman', label: 'Kriptoman' },
  { id: 'stripe', label: 'Stripe' },
];

export function DeliverableQuotePanel({ disabled }: Props) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') ?? '';
  const initialService = searchParams.get('service') ?? 'vertical-package';

  const [industryCategory, setIndustryCategory] = useState(initialCategory);
  const [deliverableId, setDeliverableId] = useState(
    DELIVERABLE_CATALOG.some((d) => d.id === initialService) ? initialService : 'vertical-package',
  );
  const [paymentProvider, setPaymentProvider] = useState<PaymentProviderId>('manual');
  const [intensity] = useState(55);
  const [checkout, setCheckout] = useState<ManualCheckout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const deliverable = DELIVERABLE_CATALOG.find((d) => d.id === deliverableId);

  const quote = useMemo(() => {
    if (!deliverable) return null;
    return calculateDeliverableQuote({
      deliverableId,
      industryCategory: industryCategory || null,
      paymentProvider,
      marketIntensity: intensity,
      tamEstimateUsd: 50_000 + intensity * 1200,
      competitionScore: Math.min(100, 30 + Math.round(intensity / 2)),
    });
  }, [deliverable, deliverableId, industryCategory, paymentProvider, intensity]);

  useEffect(() => {
    setCheckout(null);
    setSent(false);
  }, [deliverableId, industryCategory, paymentProvider, intensity]);

  const startCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/payments/manual/deliverable-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliverableId,
          industryCategory: industryCategory || undefined,
          paymentProvider,
          marketIntensity: intensity,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: ManualCheckout;
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.detail ?? json.error ?? 'checkout_failed');
      }
      setCheckout(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri kreiranju uplate.');
    } finally {
      setLoading(false);
    }
  }, [deliverableId, industryCategory, paymentProvider, intensity]);

  const markSent = useCallback(async () => {
    if (!checkout?.paymentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/atina/payments/manual/mark-sent/${checkout.paymentId}`, {
        method: 'POST',
      });
      const json = (await res.json()) as { ok?: boolean; detail?: string; error?: string };
      if (!res.ok || !json.ok) {
        throw new Error(json.detail ?? json.error ?? 'mark_sent_failed');
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška.');
    } finally {
      setLoading(false);
    }
  }, [checkout?.paymentId]);

  if (!deliverable || !quote) return null;

  return (
    <motion.div className="mt-4 space-y-4">
      <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
        Kupuješ isporuku koju platforma proizvede — ne pristup platformi. Cena = tržište + resursi + provizija.
      </p>

      <label className="block text-sm">
        <span className="text-slate-400">Isporuka</span>
        <select
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          value={deliverableId}
          onChange={(e) => setDeliverableId(e.target.value)}
          disabled={disabled || loading}
        >
          {DELIVERABLE_CATALOG.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nameSr}
            </option>
          ))}
        </select>
      </label>

      <IndustryCategorySelect
        value={industryCategory}
        onChange={setIndustryCategory}
        className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
      />

      <label className="block text-sm">
        <span className="text-slate-400">Plaćanje</span>
        <select
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          value={paymentProvider}
          onChange={(e) => setPaymentProvider(e.target.value as PaymentProviderId)}
          disabled={disabled || loading}
        >
          {PAYMENT_OPTIONS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-sm">
        <span className="text-slate-400">Kalkulisana cena: </span>
        <span className="text-xl font-bold text-white">{formatEur(quote.clientPriceEur)}</span>
        <span className="text-slate-500"> {formatBillingLabel(deliverable.billing)}</span>
        <span className="mt-1 block text-xs text-slate-500">
          Resursi {formatEur(quote.resourceCostEur)} · tržište {formatEur(quote.marketValueEur)} · provizija{' '}
          {formatEur(quote.paymentFeeEur)}
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary text-sm disabled:opacity-50"
          onClick={startCheckout}
          disabled={disabled || loading}
        >
          {loading ? 'Generišem…' : 'Generiši uputstvo za uplatu'}
        </button>
        <Link
          href={`/contact?service=${encodeURIComponent(deliverableId)}${industryCategory ? `&category=${encodeURIComponent(industryCategory)}` : ''}`}
          className="btn-glass text-sm"
        >
          Pitaj pre kupovine
        </Link>
        <Link href="/pricing" className="btn-glass text-sm">
          Svi cenovnici
        </Link>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {checkout && (
        <motion.div
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-slate-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium text-white">Uputstvo — {deliverable.nameSr}</p>
          <ul className="mt-3 space-y-1 font-mono text-xs">
            <li>Referenca: {checkout.reference}</li>
            <li>
              Iznos: {Number(checkout.amount).toFixed(2)} {checkout.currency}
            </li>
            {Object.entries(checkout.instructions).map(([k, v]) =>
              v ? (
                <li key={k}>
                  {k}: {v}
                </li>
              ) : null,
            )}
          </ul>
          {!sent ? (
            <button
              type="button"
              className="btn-glass mt-4 text-sm disabled:opacity-50"
              onClick={markSent}
              disabled={loading}
            >
              Poslao sam uplatu
            </button>
          ) : (
            <p className="mt-4 text-emerald-300">Hvala — potvrda isporuke nakon admin pregleda uplate.</p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
