'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import type { AtinaPlanSummary } from '@/lib/atina';
import { IndustryCategorySelect } from '@/components/marketing/IndustryCategorySelect';
import { getIndustryCategory, type PlanSlug } from '@/lib/category-pricing';
import {
  formatPlanMoney,
  getSaaSPlan,
  getSaaSPlanPrice,
  type BillingCurrency,
} from '@/lib/saas-plans';
import { describeAtinaError } from '@/lib/atina-errors';
import { CHECKOUT_SELECT_CLASS } from '@/lib/checkout-select-class';
import { InvoiceHistoryPanel } from '@/components/platform/InvoiceHistoryPanel';

function atinaCheckoutError(json: { error?: string; detail?: string }, fallback: string): string {
  return describeAtinaError(json.error ?? fallback);
}

type PaymentMethod = {
  id: string;
  label: string;
  description: string;
  available: boolean;
};

type ManualCheckout = {
  paymentId: string;
  reference: string;
  amount: number;
  currency: string;
  instructions: Record<string, string>;
};

type KriptomanCheckout = {
  paymentId: string;
  invoiceId: string;
  paymentUrl: string;
  payAddress?: string;
  cryptoAmount?: string;
  cryptoCurrency?: string;
  amount: number;
  currency: string;
};

type WiseCheckout = ManualCheckout;

type BillingSummary = {
  subscription: {
    plan_name?: string;
    plan_slug?: string;
    billing_cycle?: string;
    status?: string;
    current_period_end?: string;
  } | null;
  latestInvoice: {
    invoice_number?: string;
    total_amount?: number | string;
    currency?: string;
    status?: string;
    line_items?: Array<{ description?: string; amount?: number }>;
    created_at?: string;
  } | null;
};

function formatCycle(cycle?: string) {
  return cycle === 'yearly' ? 'Annual subscription' : 'Monthly subscription';
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US');
}

type Props = {
  plans: AtinaPlanSummary[];
  disabled?: boolean;
};

export function BillingCheckoutPanel({ plans, disabled }: Props) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') ?? '';
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [methodsLoaded, setMethodsLoaded] = useState(false);
  const [planSlug, setPlanSlug] = useState(
    ['starter', 'pro', 'enterprise'].includes(searchParams.get('plan') ?? '')
      ? (searchParams.get('plan') as string)
      : 'pro',
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    searchParams.get('cycle') === 'yearly' ? 'yearly' : 'monthly',
  );
  const [currency, setCurrency] = useState<BillingCurrency>(
    searchParams.get('currency')?.toUpperCase() === 'EUR' ? 'EUR' : 'USD',
  );
  const [industryCategory, setIndustryCategory] = useState(initialCategory);
  const [checkout, setCheckout] = useState<ManualCheckout | null>(null);
  const [kriptomanCheckout, setKriptomanCheckout] = useState<KriptomanCheckout | null>(null);
  const [wiseCheckout, setWiseCheckout] = useState<WiseCheckout | null>(null);
  const [cryptoCurrency, setCryptoCurrency] = useState('USDT');
  const [buyerCompany, setBuyerCompany] = useState('');
  const [buyerVatId, setBuyerVatId] = useState('');
  const [buyerBillingAddress, setBuyerBillingAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [purchase, setPurchase] = useState<BillingSummary | null>(null);

  const quotedAmount = useMemo(() => {
    const slug = (['starter', 'pro', 'enterprise'].includes(planSlug) ? planSlug : 'pro') as PlanSlug;
    return getSaaSPlanPrice(slug, billingCycle, currency);
  }, [planSlug, billingCycle, currency]);

  const categoryMeta = getIndustryCategory(industryCategory);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/atina/billing/summary');
        const json = (await res.json()) as { ok?: boolean; data?: BillingSummary };
        if (!cancelled && json.ok && json.data) setPurchase(json.data);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sent]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/atina/payments/methods');
        const json = (await res.json()) as {
          ok?: boolean;
          data?: { mode?: string; methods?: PaymentMethod[] };
        };
        if (cancelled || !json.ok || !json.data) return;
        setMethods(json.data.methods ?? []);
      } catch {
        if (!cancelled) setError('Unable to load payment methods.');
      } finally {
        if (!cancelled) setMethodsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buyerBillingPayload = useCallback(() => {
    const company = buyerCompany.trim();
    const vatId = buyerVatId.trim();
    const address = buyerBillingAddress.trim();
    return {
      ...(company ? { buyerCompany: company } : {}),
      ...(vatId ? { buyerVatId: vatId } : {}),
      ...(address ? { buyerBillingAddress: address } : {}),
    };
  }, [buyerCompany, buyerVatId, buyerBillingAddress]);

  const startKriptomanCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    setKriptomanCheckout(null);
    try {
      const res = await fetch('/api/atina/payments/kriptoman/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planSlug,
          billingCycle,
          currency,
          cryptoCurrency,
          ...(industryCategory ? { industryCategory } : {}),
          ...buyerBillingPayload(),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: KriptomanCheckout; error?: string; detail?: string };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(atinaCheckoutError(json, 'kriptoman_checkout_failed'));
      }
      setKriptomanCheckout(json.data);
      if (json.data.paymentUrl?.startsWith('http')) {
        window.open(json.data.paymentUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kriptoman checkout failed.');
    } finally {
      setLoading(false);
    }
  }, [planSlug, billingCycle, currency, cryptoCurrency, industryCategory, buyerBillingPayload]);

  const syncKriptoman = useCallback(async () => {
    if (!kriptomanCheckout?.paymentId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/atina/payments/kriptoman/sync/${kriptomanCheckout.paymentId}`, {
        method: 'POST',
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { activated?: boolean };
        error?: string;
        detail?: string;
      };
      if (!res.ok || !json.ok) {
        throw new Error(atinaCheckoutError(json, 'sync_failed'));
      }
      if (json.data?.activated) setSent(true);
      else setError('Payment is not confirmed on the network yet. Wait a few minutes and try again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify payment.');
    } finally {
      setLoading(false);
    }
  }, [kriptomanCheckout?.paymentId]);

  const checkoutPayload = useCallback(
    () => ({
      planSlug,
      billingCycle,
      currency,
      ...(industryCategory ? { industryCategory } : {}),
      ...buyerBillingPayload(),
    }),
    [planSlug, billingCycle, currency, industryCategory, buyerBillingPayload],
  );

  const startStripeCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/payments/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload()),
      });
      const json = (await res.json()) as { ok?: boolean; data?: { url?: string | null }; detail?: string; error?: string };
      if (!res.ok || !json.ok || !json.data?.url) {
        throw new Error(atinaCheckoutError(json, 'stripe_checkout_failed'));
      }
      window.location.href = json.data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Stripe checkout failed.');
    } finally {
      setLoading(false);
    }
  }, [checkoutPayload]);

  const startPayPalCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/payments/paypal/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload()),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: { approveUrl?: string };
        detail?: string;
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data?.approveUrl) {
        throw new Error(atinaCheckoutError(json, 'paypal_order_failed'));
      }
      window.location.href = json.data.approveUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PayPal checkout failed.');
    } finally {
      setLoading(false);
    }
  }, [checkoutPayload]);

  const startWiseCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    setWiseCheckout(null);
    setCheckout(null);
    setKriptomanCheckout(null);
    try {
      const res = await fetch('/api/atina/payments/wise/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload()),
      });
      const json = (await res.json()) as { ok?: boolean; data?: WiseCheckout; detail?: string; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(atinaCheckoutError(json, 'wise_transfer_failed'));
      }
      setWiseCheckout(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wise transfer failed.');
    } finally {
      setLoading(false);
    }
  }, [checkoutPayload]);

  const startManualCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSent(false);
    setKriptomanCheckout(null);
    try {
      const res = await fetch('/api/atina/payments/manual/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload()),
      });
      const json = (await res.json()) as { ok?: boolean; data?: ManualCheckout; error?: string; detail?: string };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(atinaCheckoutError(json, 'checkout_failed'));
      }
      setCheckout(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment.');
    } finally {
      setLoading(false);
    }
  }, [checkoutPayload]);

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
        throw new Error(atinaCheckoutError(json, 'mark_sent_failed'));
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm submission.');
    } finally {
      setLoading(false);
    }
  }, [checkout?.paymentId]);

  const stripeAvailable = methods.some((m) => m.id === 'stripe' && m.available);
  const paypalAvailable = methods.some((m) => m.id === 'paypal' && m.available);
  const wiseAvailable = methods.some((m) => m.id === 'wise' && m.available);
  const kriptomanAvailable = methods.some((m) => m.id === 'kriptoman' && m.available);
  const manualAvailable = !stripeAvailable && methods.some((m) => m.id === 'manual' && m.available);
  const stripePrimary = stripeAvailable;

  return (
    <motion.div className="mt-4 space-y-4">
      {!methodsLoaded && (
        <p className="flex items-center gap-2 text-sm text-slate-400" aria-live="polite">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
          Loading payment options…
        </p>
      )}
      {purchase?.subscription?.status === 'active' && (
        <motion.div
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-slate-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium text-white">Your subscription (active)</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <span className="text-slate-500">Plan:</span>{' '}
              {purchase.subscription.plan_name ?? purchase.subscription.plan_slug}
            </li>
            <li>
              <span className="text-slate-500">Type:</span> {formatCycle(purchase.subscription.billing_cycle)}
            </li>
            <li>
              <span className="text-slate-500">Valid until:</span>{' '}
              {formatDate(purchase.subscription.current_period_end)}
            </li>
          </ul>
        </motion.div>
      )}

      <InvoiceHistoryPanel />

      <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <p className="text-xs font-medium text-slate-300">Buyer billing (optional)</p>
        <p className="text-[11px] text-slate-500">
          Stored with the payment for invoices. Tax calculation stays platform-side; issuer company fields are
          separate.
        </p>
        <label className="block text-sm">
          <span className="text-slate-400">Company name</span>
          <input
            className={CHECKOUT_SELECT_CLASS}
            value={buyerCompany}
            onChange={(e) => setBuyerCompany(e.target.value)}
            disabled={disabled || loading}
            placeholder="Acme Ltd"
            maxLength={120}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">VAT / tax ID</span>
          <input
            className={CHECKOUT_SELECT_CLASS}
            value={buyerVatId}
            onChange={(e) => setBuyerVatId(e.target.value)}
            disabled={disabled || loading}
            placeholder="DE123456789"
            maxLength={64}
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Billing address</span>
          <input
            className={CHECKOUT_SELECT_CLASS}
            value={buyerBillingAddress}
            onChange={(e) => setBuyerBillingAddress(e.target.value)}
            disabled={disabled || loading}
            placeholder="Street, city, country"
            maxLength={240}
          />
        </label>
      </div>

      {stripePrimary && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
          <span className="font-medium text-white">Active payment method: Card (Stripe)</span>
          <span className="mt-1 block text-emerald-200/90">
            Pay by card. Bank transfer (IBAN) is not required.
          </span>
        </p>
      )}

      {!stripeAvailable && manualAvailable && (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
          Card checkout is not configured yet. Bank transfer is available as a temporary fallback.
        </p>
      )}

      <IndustryCategorySelect
        value={industryCategory}
        onChange={(slug) => {
          setIndustryCategory(slug);
          setCheckout(null);
          setKriptomanCheckout(null);
          setSent(false);
        }}
        className="rounded-xl border border-white/5 bg-white/[0.02] p-3"
      />

      <motion.div className="grid gap-3 sm:grid-cols-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <label className="block text-sm">
          <span className="text-slate-400">Plan</span>
          <select
            className={CHECKOUT_SELECT_CLASS}
            value={planSlug}
            onChange={(e) => setPlanSlug(e.target.value)}
            disabled={disabled || loading}
          >
            {plans.map((p) => {
              const slug = (p.slug ?? 'pro') as PlanSlug;
              const price = getSaaSPlanPrice(slug, billingCycle, currency);
              return (
                <option key={p.slug ?? p.name} value={p.slug ?? 'pro'}>
                  {getSaaSPlan(slug).name} — {formatPlanMoney(price, currency)}
                  {billingCycle === 'yearly' ? '/yr' : '/mo'}
                </option>
              );
            })}
            {!plans.length && (
              <>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </>
            )}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Billing cycle</span>
          <select
            className={CHECKOUT_SELECT_CLASS}
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
            disabled={disabled || loading}
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Annual</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-slate-400">Billing currency</span>
          <select
            className={CHECKOUT_SELECT_CLASS}
            value={currency}
            onChange={(e) => setCurrency(e.target.value as BillingCurrency)}
            disabled={disabled || loading}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
      </motion.div>

      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100">
        Amount due:{' '}
        <span className="font-semibold text-white">{formatPlanMoney(quotedAmount, currency)}</span>
        {billingCycle === 'yearly' ? ' / year' : ' / month'}
        {categoryMeta ? ` · ${categoryMeta.name} workspace profile` : ''}
      </p>

      {kriptomanAvailable && (
        <div className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="text-xs font-medium text-amber-100">Kriptoman — crypto payment</p>
          <label className="block text-sm">
            <span className="text-slate-400">Currency</span>
            <select
              className={CHECKOUT_SELECT_CLASS}
              value={cryptoCurrency}
              onChange={(e) => setCryptoCurrency(e.target.value)}
              disabled={disabled || loading}
            >
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </label>
          <button
            type="button"
            className="btn-glass w-full text-sm disabled:opacity-50"
            onClick={startKriptomanCheckout}
            disabled={disabled || loading}
          >
            {loading ? 'Kriptoman…' : 'Pay with Kriptoman'}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {stripeAvailable && (
          <button
            type="button"
            className="btn-primary text-sm disabled:opacity-50"
            onClick={startStripeCheckout}
            disabled={disabled || loading}
          >
            Pay with card (Stripe)
          </button>
        )}
        {paypalAvailable && (
          <button
            type="button"
            className="btn-glass text-sm disabled:opacity-50"
            onClick={startPayPalCheckout}
            disabled={disabled || loading}
          >
            PayPal
          </button>
        )}
        {wiseAvailable && (
          <button
            type="button"
            className="btn-glass text-sm disabled:opacity-50"
            onClick={startWiseCheckout}
            disabled={disabled || loading}
          >
            International transfer (Wise)
          </button>
        )}
        {manualAvailable && (
          <button
            type="button"
            className="btn-glass text-sm disabled:opacity-50"
            onClick={startManualCheckout}
            disabled={disabled || loading}
          >
            {loading ? 'Generating…' : 'Bank transfer'}
          </button>
        )}
      </div>

      {methodsLoaded &&
        !stripeAvailable &&
        !paypalAvailable &&
        !wiseAvailable &&
        !manualAvailable &&
        !kriptomanAvailable && (
          <p className="text-sm text-amber-400/90">
            Online payment is being set up. Please contact us and we&apos;ll send you payment
            instructions to complete your order.
          </p>
        )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {kriptomanCheckout && (
        <motion.div
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-slate-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium text-white">Kriptoman checkout</p>
          <ul className="mt-3 space-y-1 font-mono text-xs">
            <li>Payment ID: {kriptomanCheckout.paymentId}</li>
            <li>
              Amount: {kriptomanCheckout.amount.toFixed(2)} {kriptomanCheckout.currency}
            </li>
            {kriptomanCheckout.cryptoAmount && (
              <li>
                Crypto: {kriptomanCheckout.cryptoAmount} {kriptomanCheckout.cryptoCurrency}
              </li>
            )}
            {kriptomanCheckout.payAddress && <li>Address: {kriptomanCheckout.payAddress}</li>}
          </ul>
          {kriptomanCheckout.paymentUrl && (
            <a
              href={kriptomanCheckout.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs text-amber-300 underline"
            >
              Reopen checkout
            </a>
          )}
          {!sent ? (
            <button
              type="button"
              className="btn-glass mt-4 text-sm disabled:opacity-50"
              onClick={syncKriptoman}
              disabled={loading}
            >
              Check if payment arrived
            </button>
          ) : (
            <p className="mt-4 text-emerald-300">Payment confirmed — plan activated.</p>
          )}
        </motion.div>
      )}

      {wiseCheckout && (
        <motion.div
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-slate-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium text-white">International transfer instructions</p>
          <ul className="mt-3 space-y-1 font-mono text-xs">
            <li>Reference: {wiseCheckout.reference}</li>
            <li>
              Amount: {Number(wiseCheckout.amount).toFixed(2)} {wiseCheckout.currency}
            </li>
            {Object.entries(wiseCheckout.instructions).map(([k, v]) =>
              v ? (
                <li key={k}>
                  {k}: {v}
                </li>
              ) : null
            )}
          </ul>
          <p className="mt-4 text-xs text-slate-400">
            Send the transfer using the details above. An admin confirms payment after verifying it on the bank
            statement — same process as IBAN checkout.
          </p>
        </motion.div>
      )}

      {checkout && (
        <motion.div
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-slate-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium text-white">Bank transfer (IBAN) instructions</p>
          <p className="mt-2 text-xs text-slate-400">
            Purchasing: <span className="text-white">{planSlug}</span> · {formatCycle(billingCycle)}
            {categoryMeta ? ` · ${categoryMeta.name}` : ''}
          </p>
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
              ) : null
            )}
          </ul>
          {!sent ? (
            <button
              type="button"
              className="btn-glass mt-4 text-sm disabled:opacity-50"
              onClick={markSent}
              disabled={loading}
            >
              I have sent the payment
            </button>
          ) : (
            <p className="mt-4 text-emerald-300">
              Thank you — an admin will confirm payment and activate your plan (usually within 24 hours).
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
