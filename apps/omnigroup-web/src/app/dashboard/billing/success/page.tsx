'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

export default function BillingSuccessPage() {
  const params = useSearchParams();
  const provider = params.get('provider') ?? 'stripe';
  const sessionId = params.get('session_id');
  const paymentId = params.get('payment_id');

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Payment successful</h1>
      <p className="mt-2 text-slate-400">
        {provider === 'kriptoman'
          ? 'Crypto payment received. Your plan activates within a few minutes.'
          : 'Thank you — your payment was received. Your subscription activates shortly and the invoice will arrive by email.'}
      </p>
      {provider === 'stripe' && (
        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          If billing still shows pending after a few minutes, open Billing and refresh — card payments sometimes need a
          manual verification step on our side before the plan activates.
        </p>
      )}
      {(sessionId || paymentId) && (
        <p className="mt-3 font-mono text-xs text-slate-500">
          {sessionId ? `Session: ${sessionId.slice(0, 24)}…` : `Payment: ${paymentId}`}
        </p>
      )}
      <Link href="/dashboard#billing" className="btn-primary mt-8 inline-block text-sm">
        Back to billing
      </Link>
    </div>
  );
}
