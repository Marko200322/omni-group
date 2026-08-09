'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function PayPalSuccessPage() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'ok' | 'err'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('err');
      setMessage('We could not read your PayPal confirmation. Please return to billing and try again.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/atina/payments/paypal/capture/${token}`, { method: 'POST' });
        const json = (await res.json()) as { ok?: boolean; detail?: string; error?: string };
        if (!res.ok || !json.ok) throw new Error('capture_failed');
        setStatus('ok');
      } catch {
        setStatus('err');
        setMessage(
          "We couldn't confirm your PayPal payment automatically. If you completed the payment, it will be reconciled shortly — contact support if your plan isn't active soon.",
        );
      }
    })();
  }, [token]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      {status === 'loading' && <Loader2 className="mx-auto h-12 w-12 animate-spin text-violet-400" />}
      {status === 'ok' && <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />}
      <h1 className="mt-4 font-display text-2xl font-bold text-white">
        {status === 'loading' ? 'Confirming PayPal…' : status === 'ok' ? 'PayPal payment successful' : 'Error'}
      </h1>
      <p className="mt-2 text-slate-400">
        {status === 'ok'
          ? 'Plan activated. Invoice will arrive by email.'
          : status === 'err'
            ? message
            : 'Please wait…'}
      </p>
      {status !== 'loading' && (
        <Link href="/dashboard#billing" className="btn-primary mt-8 inline-block text-sm">
          Back to billing
        </Link>
      )}
    </div>
  );
}
