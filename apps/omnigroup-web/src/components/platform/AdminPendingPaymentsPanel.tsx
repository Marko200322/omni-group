'use client';

import { useCallback, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { AtinaAdminPayment } from '@/lib/atina-live-types';
import { GlassCard } from '@/components/ui/GlassCard';

function parseMetadata(raw: AtinaAdminPayment['metadata']): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function formatAmount(amount: number | string, currency: string): string {
  const n = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (Number.isNaN(n)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

type Props = {
  initialPayments: AtinaAdminPayment[];
  disabled?: boolean;
};

export function AdminPendingPaymentsPanel({ initialPayments, disabled }: Props) {
  const [payments, setPayments] = useState(initialPayments);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/atina/admin/payments?status=processing&provider=manual&limit=50');
      const body = (await res.json()) as { ok: boolean; data?: AtinaAdminPayment[]; error?: string; detail?: string };
      if (!body.ok) throw new Error(body.detail ?? body.error ?? 'refresh_failed');
      setPayments(body.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  const confirmPayment = async (paymentId: string) => {
    setBusyId(paymentId);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/atina/payments/manual/confirm/${paymentId}`, { method: 'POST' });
      const body = (await res.json()) as { ok: boolean; detail?: string; error?: string };
      if (!body.ok) throw new Error(body.detail ?? body.error ?? 'confirm_failed');
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      setMessage('Payment confirmed — the client receives an invoice and an activated plan.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <GlassCard delay={0.41}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Pending payments</h2>
          <p className="mt-1 text-sm text-slate-400">
            Manual transfers the client marked as sent — confirm after reviewing the bank statement.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || loading}
          className="btn-ghost flex items-center gap-1 text-violet-300 disabled:opacity-50"
          onClick={() => void refresh()}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {disabled && (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
          Sign in with an admin account (not demo) to view and confirm payments.
        </p>
      )}

      {!disabled && payments.length === 0 && (
        <p className="text-sm text-slate-500">No payments in &quot;processing&quot; status — everything is handled.</p>
      )}

      {!disabled && payments.length > 0 && (
        <ul className="space-y-3">
          {payments.map((payment) => {
            const meta = parseMetadata(payment.metadata);
            const reference = String(meta.reference ?? '—');
            const planSlug = String(meta.planSlug ?? '—');
            const billingCycle = String(meta.billingCycle ?? '—');
            return (
              <li
                key={payment.id}
                className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">
                      {payment.user_name ?? payment.email ?? 'Client'}
                    </p>
                    <p className="text-xs text-slate-500">{payment.email}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {formatAmount(payment.amount, payment.currency)} · plan{' '}
                      <span className="text-violet-300">{planSlug}</span> · {billingCycle}
                    </p>
                    <p className="mt-1 font-mono text-xs text-cyan-300/90">Ref: {reference}</p>
                    <p className="mt-1 text-xs text-slate-500">{payment.description}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === payment.id}
                    className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
                    onClick={() => void confirmPayment(payment.id)}
                  >
                    {busyId === payment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Confirm payment
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
    </GlassCard>
  );
}
