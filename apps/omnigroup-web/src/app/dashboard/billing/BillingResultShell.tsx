import { PlatformShell } from '@/components/platform/PlatformShell';
import { getServerSession } from '@/lib/auth-session';

export default async function BillingResultShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  return (
    <PlatformShell
      variant="client"
      title="Billing"
      subtitle="Payment status"
      sessionUser={session?.user ?? null}
      isDemo={session?.demo ?? false}
    >
      {children}
    </PlatformShell>
  );
}
