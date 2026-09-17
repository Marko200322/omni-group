import { Suspense } from 'react';
import { PlatformShell } from '@/components/platform/PlatformShell';
import { getServerSession } from '@/lib/auth-session';

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  return (
    <PlatformShell
      variant="client"
      title="Billing"
      subtitle="Payment status"
      sessionUser={session?.user ?? null}
      isDemo={session?.demo ?? false}
    >
      <Suspense fallback={<div className="py-12 text-center text-slate-400">Loading…</div>}>{children}</Suspense>
    </PlatformShell>
  );
}
