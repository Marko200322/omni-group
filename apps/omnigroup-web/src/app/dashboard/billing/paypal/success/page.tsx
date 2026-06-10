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
      setMessage('Nedostaje PayPal token.');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/atina/payments/paypal/capture/${token}`, { method: 'POST' });
        const json = (await res.json()) as { ok?: boolean; detail?: string; error?: string };
        if (!res.ok || !json.ok) throw new Error(json.detail ?? json.error ?? 'capture_failed');
        setStatus('ok');
      } catch (err) {
        setStatus('err');
        setMessage(err instanceof Error ? err.message : 'Capture nije uspeo');
      }
    })();
  }, [token]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      {status === 'loading' && <Loader2 className="mx-auto h-12 w-12 animate-spin text-violet-400" />}
      {status === 'ok' && <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-400" />}
      <h1 className="mt-4 font-display text-2xl font-bold text-white">
        {status === 'loading' ? 'Potvrđujem PayPal…' : status === 'ok' ? 'PayPal uplata uspešna' : 'Greška'}
      </h1>
      <p className="mt-2 text-slate-400">
        {status === 'ok'
          ? 'Plan je aktiviran. Faktura stiže na email.'
          : status === 'err'
            ? message
            : 'Sačekaj trenutak…'}
      </p>
      {status !== 'loading' && (
        <Link href="/dashboard#billing" className="btn-primary mt-8 inline-block text-sm">
          Nazad na billing
        </Link>
      )}
    </div>
  );
}
