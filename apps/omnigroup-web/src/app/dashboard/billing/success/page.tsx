'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock3, XCircle } from 'lucide-react';

type CheckoutState = 'PAID' | 'PROCESSING' | 'FAILED' | 'CANCELLED' | 'UNKNOWN';

type SessionStatus = {
  state: CheckoutState;
  message: string;
  livemode?: boolean;
  paymentStatus?: string;
  localPaymentStatus?: string | null;
  planSlug?: string | null;
  deliverableId?: string | null;
  paymentId?: string | null;
  sessionId?: string;
};

function stateVisual(state: CheckoutState) {
  switch (state) {
    case 'PAID':
      return {
        Icon: CheckCircle2,
        iconClass: 'text-emerald-400',
        title: 'Payment confirmed',
      };
    case 'PROCESSING':
      return {
        Icon: Clock3,
        iconClass: 'text-amber-300',
        title: 'Confirming payment',
      };
    case 'FAILED':
      return {
        Icon: XCircle,
        iconClass: 'text-rose-400',
        title: 'Payment not completed',
      };
    case 'CANCELLED':
      return {
        Icon: XCircle,
        iconClass: 'text-slate-400',
        title: 'Checkout cancelled',
      };
    default:
      return {
        Icon: AlertCircle,
        iconClass: 'text-slate-300',
        title: 'Payment status unknown',
      };
  }
}

function BillingSuccessContent() {
  const params = useSearchParams();
  const provider = params.get('provider') ?? 'stripe';
  const sessionId = params.get('session_id');
  const paymentId = params.get('payment_id');
  const deliverable = params.get('deliverable');

  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(provider === 'stripe' && Boolean(sessionId));

  useEffect(() => {
    if (provider !== 'stripe' || !sessionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `/api/atina/payments/stripe/checkout-session/${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' },
        );
        const body = (await res.json()) as { ok?: boolean; data?: SessionStatus; error?: string };
        if (!res.ok || !body.ok || !body.data?.state) {
          if (!cancelled) {
            setError('Could not verify payment with Stripe. Open Billing to check status.');
            setLoading(false);
          }
          return;
        }
        if (cancelled) return;
        setStatus(body.data);
        setError(null);
        setLoading(false);
        // Webhook may lag — re-poll briefly while PROCESSING.
        if (body.data.state === 'PROCESSING' && attempts < 6) {
          timer = setTimeout(load, 2500);
        }
      } catch {
        if (!cancelled) {
          setError('Could not verify payment with Stripe. Open Billing to check status.');
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [provider, sessionId]);

  if (provider === 'kriptoman') {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Clock3 className="mx-auto h-14 w-14 text-amber-300" />
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Crypto payment received</h1>
        <p className="mt-2 text-slate-400">
          Your plan activates after on-chain confirmation (usually within a few minutes).
        </p>
        {paymentId && <p className="mt-3 font-mono text-xs text-slate-500">Payment: {paymentId}</p>}
        <Link href="/dashboard/billing" className="btn-primary mt-8 inline-block text-sm">
          Back to billing
        </Link>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-14 w-14 text-slate-300" />
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Missing checkout session</h1>
        <p className="mt-2 text-slate-400">
          This page cannot confirm a payment without a Stripe session id. Open Billing to see your
          latest status.
        </p>
        <Link href="/dashboard/billing" className="btn-primary mt-8 inline-block text-sm">
          Back to billing
        </Link>
      </div>
    );
  }

  if (loading && !status) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Clock3 className="mx-auto h-14 w-14 animate-pulse text-amber-300" />
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Verifying payment…</h1>
        <p className="mt-2 text-slate-400">Checking Stripe session status server-side.</p>
      </div>
    );
  }

  if (error && !status) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <AlertCircle className="mx-auto h-14 w-14 text-slate-300" />
        <h1 className="mt-4 font-display text-2xl font-bold text-white">Unable to verify</h1>
        <p className="mt-2 text-slate-400">{error}</p>
        <Link href="/dashboard/billing" className="btn-primary mt-8 inline-block text-sm">
          Back to billing
        </Link>
      </div>
    );
  }

  const state = status?.state ?? 'UNKNOWN';
  const visual = stateVisual(state);
  const Icon = visual.Icon;

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <Icon className={`mx-auto h-14 w-14 ${visual.iconClass}`} />
      <h1 className="mt-4 font-display text-2xl font-bold text-white">{visual.title}</h1>
      <p className="mt-2 text-slate-400">
        {status?.message ?? 'We could not determine payment status yet.'}
      </p>
      {status?.livemode === false && (
        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Stripe TEST mode — this was not a live charge.
        </p>
      )}
      {(status?.sessionId || paymentId || deliverable) && (
        <p className="mt-3 font-mono text-xs text-slate-500">
          {status?.sessionId
            ? `Session: ${status.sessionId.slice(0, 24)}…`
            : paymentId
              ? `Payment: ${paymentId}`
              : null}
          {deliverable ? ` · ${deliverable}` : null}
        </p>
      )}
      <Link href="/dashboard/billing" className="btn-primary mt-8 inline-block text-sm">
        Back to billing
      </Link>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-20 text-center text-slate-400">Loading…</div>
      }
    >
      <BillingSuccessContent />
    </Suspense>
  );
}
