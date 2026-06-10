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
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Plaćanje uspešno</h1>
      <p className="mt-2 text-slate-400">
        {provider === 'kriptoman'
          ? 'Kripto uplata je primljena. Plan se aktivira u roku od nekoliko minuta.'
          : 'Pretplata je aktivirana. Faktura stiže na email sa PDF prilogom.'}
      </p>
      {(sessionId || paymentId) && (
        <p className="mt-3 font-mono text-xs text-slate-500">
          {sessionId ? `Session: ${sessionId.slice(0, 24)}…` : `Payment: ${paymentId}`}
        </p>
      )}
      <Link href="/dashboard#billing" className="btn-primary mt-8 inline-block text-sm">
        Nazad na billing
      </Link>
    </div>
  );
}
