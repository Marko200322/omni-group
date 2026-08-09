'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { IndustryCategorySelect } from '@/components/marketing/IndustryCategorySelect';
import { deliverableLabel } from '@/lib/display-text';
import { formatEur } from '@/lib/category-pricing';
import { DELIVERABLE_CATALOG } from '@/lib/deliverable-catalog';
import {
  canCheckoutPackage,
  listCheckoutPackages,
} from '@/lib/package-delivery-spec';
import { getClientOffer } from '@/lib/client-offers';
import { isLeanProdMode } from '@/lib/prod-mode';
import {
  calculateDeliverableQuote,
  formatBillingLabel,
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

const PAYMENT_METHOD_LABEL = 'Bank transfer (IBAN)';

export function DeliverableQuotePanel({ disabled }: Props) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') ?? '';
  const initialVertical = searchParams.get('vertical') ?? '';
  const initialService = searchParams.get('service') ?? '';
  const leanDefault = listCheckoutPackages()[0] ?? 'setup-quick';
  const resolvedInitial =
    initialService && DELIVERABLE_CATALOG.some((d) => d.id === initialService)
      ? initialService
      : leanDefault;

  const [industryCategory, setIndustryCategory] = useState(initialCategory);
  const verticalSlug = initialVertical;
  const [deliverableId, setDeliverableId] = useState(resolvedInitial);
  const [intensity] = useState(55);
  const [checkout, setCheckout] = useState<ManualCheckout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const deliverable = DELIVERABLE_CATALOG.find((d) => d.id === deliverableId);
  const clientOffer = getClientOffer(deliverableId);
  const checkoutAllowed = canCheckoutPackage(deliverableId);
  const checkoutIds = listCheckoutPackages();
  const catalogOrdered = [
    ...DELIVERABLE_CATALOG.filter((d) => checkoutIds.includes(d.id)),
    ...DELIVERABLE_CATALOG.filter((d) => !checkoutIds.includes(d.id)),
  ];

  const quote = useMemo(() => {
    if (!deliverable) return null;
    return calculateDeliverableQuote({
      deliverableId,
      industryCategory: industryCategory || null,
      verticalSlug: verticalSlug || null,
      paymentProvider: 'manual',
      marketIntensity: intensity,
      tamEstimateUsd: 50_000 + intensity * 1200,
      competitionScore: Math.min(100, 30 + Math.round(intensity / 2)),
    });
  }, [deliverable, deliverableId, industryCategory, verticalSlug, intensity]);

  useEffect(() => {
    setCheckout(null);
    setSent(false);
  }, [deliverableId, industryCategory, verticalSlug, intensity]);

  const startCheckout = useCallback(async () => {
    if (!checkoutAllowed) {
      setError('This package is currently available by request — use “Ask before buying” or Contact and our team will set it up for you.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/payments/manual/deliverable-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliverableId,
          industryCategory: industryCategory || undefined,
          paymentProvider: 'manual',
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
        const human = json.detail && /\s/.test(json.detail) ? json.detail : null;
        throw new Error(human ?? 'We couldn\u2019t create your payment instructions right now. Please try again shortly.');
      }
      setCheckout(json.data);
    } catch (err) {
      setError(
        err instanceof Error && /\s/.test(err.message)
          ? err.message
          : 'We couldn\u2019t create your payment instructions right now. Please try again shortly.',
      );
    } finally {
      setLoading(false);
    }
  }, [deliverableId, industryCategory, verticalSlug, intensity, checkoutAllowed]);

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
        const human = json.detail && /\s/.test(json.detail) ? json.detail : null;
        throw new Error(human ?? 'We couldn\u2019t record your payment just now. Please try again shortly.');
      }
      setSent(true);
    } catch (err) {
      setError(
        err instanceof Error && /\s/.test(err.message)
          ? err.message
          : 'We couldn\u2019t record your payment just now. Please try again shortly.',
      );
    } finally {
      setLoading(false);
    }
  }, [checkout?.paymentId]);

  if (!deliverable || !quote) return null;

  return (
    <motion.div className="mt-4 space-y-4">
      <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
        You&apos;re buying a deliverable the platform produces — scope is listed below. Not platform access.
        {isLeanProdMode() && (
          <span className="mt-1 block text-amber-200/90">
            Some packages are currently available by request — use “Ask before buying” and our team will set them up for you.
          </span>
        )}
      </p>

      <label className="block text-sm">
        <span className="text-slate-400">Deliverable</span>
        <select
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
          value={deliverableId}
          onChange={(e) => setDeliverableId(e.target.value)}
          disabled={disabled || loading}
        >
          {catalogOrdered.map((d) => {
            const ok = canCheckoutPackage(d.id);
            return (
              <option key={d.id} value={d.id}>
                {deliverableLabel(d)}
                {!ok ? ' (not open yet)' : ''}
              </option>
            );
          })}
        </select>
      </label>

      {clientOffer && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
          <p className="font-medium text-emerald-300">{clientOffer.promise}</p>
          <p className="mt-1 text-xs leading-relaxed">{clientOffer.summary}</p>
          <ul className="mt-2 space-y-1 text-xs">
            {clientOffer.youGet.map((line) => (
              <li key={line}>✓ {line}</li>
            ))}
          </ul>
          {clientOffer.notIncluded.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-slate-500">
              {clientOffer.notIncluded.map((line) => (
                <li key={line}>✕ {line}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-500">{clientOffer.when}</p>
        </div>
      )}

      <IndustryCategorySelect
        value={industryCategory}
        onChange={setIndustryCategory}
        className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
      />

      <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100">
        <span className="text-slate-400">Payment method: </span>
        <span className="font-medium text-white">{PAYMENT_METHOD_LABEL}</span>
        <span className="mt-1 block text-xs text-emerald-200/80">
          Card and crypto checkout are not available for deliverables — pay by bank transfer using the reference we
          generate.
        </span>
      </div>

      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-sm">
        <span className="text-slate-400">Quoted price: </span>
        <span className="text-xl font-bold text-white">{formatEur(quote.clientPriceEur)}</span>
        <span className="text-slate-500"> {formatBillingLabel(deliverable.billing)}</span>
        <span className="mt-1 block text-xs text-slate-500">
          {clientOffer?.when ?? 'After payment confirmation'}
        </span>
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary text-sm disabled:opacity-50"
          onClick={startCheckout}
          disabled={disabled || loading || !checkoutAllowed}
        >
          {loading ? 'Generating…' : checkoutAllowed ? 'Generate payment instructions' : 'Available on request'}
        </button>
        <Link
          href={`/contact?service=${encodeURIComponent(deliverableId)}${industryCategory ? `&category=${encodeURIComponent(industryCategory)}` : ''}`}
          className="btn-glass text-sm"
        >
          Ask before buying
        </Link>
        <Link href="/pricing" className="btn-glass text-sm">
          All pricing
        </Link>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {checkout && (
        <motion.div
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-slate-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium text-white">Instructions — {deliverableLabel(deliverable)}</p>
          <ul className="mt-3 space-y-1 font-mono text-xs">
            <li>Reference: {checkout.reference}</li>
            <li>
              Amount: {Number(checkout.amount).toFixed(2)} {checkout.currency}
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
              I&apos;ve sent the payment
            </button>
          ) : (
            <p className="mt-4 text-emerald-300">Thanks — delivery is confirmed after admin reviews the payment.</p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
