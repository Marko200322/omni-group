import { Suspense } from 'react';

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="px-4 py-20 text-center text-slate-400">Učitavanje…</div>}>
      {children}
    </Suspense>
  );
}
