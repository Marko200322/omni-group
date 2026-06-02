'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { AtinaPlanSummary } from '@/lib/atina';

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
  return cycle === 'yearly' ? 'Godišnja pretplata' : 'Mesečna pretplata';
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('sr-RS');
}

type Props = {
  plans: AtinaPlanSummary[];
  disabled?: boolean;
};

export function BillingCheckoutPanel({ plans, disabled }: Props) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [mode, setMode] = useState<string>('manual');
  const [planSlug, setPlanSlug] = useState('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [checkout, setCheckout] = useState<ManualCheckout | null>(null);
  const [kriptomanCheckout, setKriptomanCheckout] = useState<KriptomanCheckout | null>(null);
  const [cryptoCurrency, setCryptoCurrency] = useState('USDT');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [purchase, setPurchase] = useState<BillingSummary | null>(null);

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
        setMode(json.data.mode ?? 'manual');
        setMethods(json.data.methods ?? []);
      } catch {
        if (!cancelled) setError('Ne mogu da učitam načine plaćanja.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const startKriptomanCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    setKriptomanCheckout(null);
    try {
      const res = await fetch('/api/atina/payments/kriptoman/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug, billingCycle, cryptoCurrency }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: KriptomanCheckout; error?: string; detail?: string };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.detail ?? json.error ?? 'kriptoman_checkout_failed');
      }
      setKriptomanCheckout(json.data);
      if (json.data.paymentUrl?.startsWith('http')) {
        window.open(json.data.paymentUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri Kriptoman checkout-u.');
    } finally {
      setLoading(false);
    }
  }, [planSlug, billingCycle, cryptoCurrency]);

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
        throw new Error(json.detail ?? json.error ?? 'sync_failed');
      }
      if (json.data?.activated) setSent(true);
      else setError('Uplata još nije potvrđena na mreži. Sačekaj nekoliko minuta i probaj ponovo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri proveri uplate.');
    } finally {
      setLoading(false);
    }
  }, [kriptomanCheckout?.paymentId]);

  const startManualCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSent(false);
    setKriptomanCheckout(null);
    try {
      const res = await fetch('/api/atina/payments/manual/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug, billingCycle }),
      });
      const json = (await res.json()) as { ok?: boolean; data?: ManualCheckout; error?: string; detail?: string };
      if (!res.ok || !json.ok || !json.data) {
        throw new Error(json.detail ?? json.error ?? 'checkout_failed');
      }
      setCheckout(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Greška pri kreiranju uplate.');
    } finally {
      setLoading(false);
    }
  }, [planSlug, billingCycle]);

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
      setError(err instanceof Error ? err.message : 'Greška pri potvrdi slanja.');
    } finally {
      setLoading(false);
    }
  }, [checkout?.paymentId]);

  const manualAvailable = methods.some((m) => m.id === 'manual' && m.available);
  const kriptomanAvailable = methods.some((m) => m.id === 'kriptoman' && m.available);

  return (
    <motion.div className="mt-4 space-y-4">
      {purchase?.subscription?.status === 'active' && (
        <motion.div
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-slate-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium text-white">Tvoja kupovina (aktivno)</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <span className="text-slate-500">Plan:</span>{' '}
              {purchase.subscription.plan_name ?? purchase.subscription.plan_slug}
            </li>
            <li>
              <span className="text-slate-500">Tip:</span> {formatCycle(purchase.subscription.billing_cycle)}
            </li>
            <li>
              <span className="text-slate-500">Važi do:</span>{' '}
              {formatDate(purchase.subscription.current_period_end)}
            </li>
            {purchase.latestInvoice?.invoice_number && (
              <>
                <li>
                  <span className="text-slate-500">Faktura:</span> {purchase.latestInvoice.invoice_number}
                </li>
                <li>
                  <span className="text-slate-500">Plaćeno:</span>{' '}
                  {Number(purchase.latestInvoice.total_amount ?? 0).toFixed(2)}{' '}
                  {purchase.latestInvoice.currency ?? 'EUR'}
                </li>
                {purchase.latestInvoice.line_items?.[0]?.description && (
                  <li>
                    <span className="text-slate-500">Stavka:</span>{' '}
                    {purchase.latestInvoice.line_items[0].description}
                  </li>
                )}
              </>
            )}
          </ul>
        </motion.div>
      )}

      {mode === 'manual' && (
        <p className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
          Režim bez firme — bankovni transfer. Kad otvoriš firmu, prebaci na Stripe (PAYMENTS_MODE=sandbox/live).
        </p>
      )}

      <motion.div className="grid gap-3 sm:grid-cols-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <label className="block text-sm">
          <span className="text-slate-400">Plan</span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={planSlug}
            onChange={(e) => setPlanSlug(e.target.value)}
            disabled={disabled || loading}
          >
            {plans.map((p) => (
              <option key={p.slug ?? p.name} value={p.slug ?? 'pro'}>
                {p.name ?? p.slug}
              </option>
            ))}
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
          <span className="text-slate-400">Ciklus</span>
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            value={billingCycle}
            onChange={(e) => setBillingCycle(e.target.value as 'monthly' | 'yearly')}
            disabled={disabled || loading}
          >
            <option value="monthly">Mesečno</option>
            <option value="yearly">Godišnje</option>
          </select>
        </label>
      </motion.div>

      {kriptomanAvailable && (
        <div className="space-y-2 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="text-xs font-medium text-amber-100">Kriptoman — kripto uplata</p>
          <label className="block text-sm">
            <span className="text-slate-400">Valuta</span>
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
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
            {loading ? 'Kriptoman…' : 'Plati preko Kriptoman'}
          </button>
        </div>
      )}

      {manualAvailable ? (
        <button
          type="button"
          className="btn-primary text-sm disabled:opacity-50"
          onClick={startManualCheckout}
          disabled={disabled || loading}
        >
          {loading ? 'Generišem uputstvo…' : 'Generiši uputstvo za uplatu (banka)'}
        </button>
      ) : (
        !kriptomanAvailable && (
          <p className="text-sm text-amber-400/90">
            Ručna uplata nije podešena — popuni MANUAL_PAYMENT_* ili KRIPTOMAN_* u Atina .env.
          </p>
        )
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
              Iznos: {kriptomanCheckout.amount.toFixed(2)} {kriptomanCheckout.currency}
            </li>
            {kriptomanCheckout.cryptoAmount && (
              <li>
                Kripto: {kriptomanCheckout.cryptoAmount} {kriptomanCheckout.cryptoCurrency}
              </li>
            )}
            {kriptomanCheckout.payAddress && <li>Adresa: {kriptomanCheckout.payAddress}</li>}
          </ul>
          {kriptomanCheckout.paymentUrl && (
            <a
              href={kriptomanCheckout.paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block text-xs text-amber-300 underline"
            >
              Otvori checkout ponovo
            </a>
          )}
          {!sent ? (
            <button
              type="button"
              className="btn-glass mt-4 text-sm disabled:opacity-50"
              onClick={syncKriptoman}
              disabled={loading}
            >
              Proveri da li je uplata stigla
            </button>
          ) : (
            <p className="mt-4 text-emerald-300">Uplata potvrđena — plan je aktiviran.</p>
          )}
        </motion.div>
      )}

      {checkout && (
        <motion.div
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-slate-200"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="font-medium text-white">Uputstvo za uplatu</p>
          <p className="mt-2 text-xs text-slate-400">
            Kupuješ: <span className="text-white">{planSlug}</span> · {formatCycle(billingCycle)}
          </p>
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
              Poslao sam uplatu
            </button>
          ) : (
            <p className="mt-4 text-emerald-300">
              Hvala — admin potvrđuje uplatu i aktivira plan (obično do 24h).
            </p>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
