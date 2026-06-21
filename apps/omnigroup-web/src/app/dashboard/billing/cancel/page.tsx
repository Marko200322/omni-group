'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function BillingCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <XCircle className="mx-auto h-14 w-14 text-amber-400" />
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Payment canceled</h1>
      <p className="mt-2 text-slate-400">Checkout was not completed. You can try again when you&apos;re ready.</p>
      <Link href="/dashboard#billing" className="btn-glass mt-8 inline-block text-sm">
        Back to billing
      </Link>
    </div>
  );
}
