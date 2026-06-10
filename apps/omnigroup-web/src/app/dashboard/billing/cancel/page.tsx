'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function BillingCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <XCircle className="mx-auto h-14 w-14 text-amber-400" />
      <h1 className="mt-4 font-display text-2xl font-bold text-white">Plaćanje otkazano</h1>
      <p className="mt-2 text-slate-400">Nisi završio checkout. Možeš probati ponovo kad budeš spreman.</p>
      <Link href="/dashboard#billing" className="btn-glass mt-8 inline-block text-sm">
        Nazad na billing
      </Link>
    </div>
  );
}
