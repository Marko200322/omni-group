import AdminClient from './AdminClient';
import { loadAtinaPublicSnapshot } from '@/lib/atina';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import type { AtinaAdminPayment } from '@/lib/atina-live-types';
import { getServerSession, isAdminRole } from '@/lib/auth-session';
import {
  buildLiveMarketKpi,
  type RevenueAllocationSummary,
} from '@/lib/market-analytics';
import type { AtinaAdminOverview } from '@/lib/atina-live-types';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession();
  const snapshot = await loadAtinaPublicSnapshot();
  const isAdmin = Boolean(session && !session.demo && isAdminRole(session.user.role));

  let overview: AtinaAdminOverview | null = null;
  let overviewError: string | undefined;
  let pendingPayments: AtinaAdminPayment[] = [];
  let marketKpi = buildLiveMarketKpi(null, null, false);

  if (isAdmin && session) {
    // Single parallel round trip — overview was previously fetched twice and
    // serially, which added a full backend hop to every admin page load.
    const [overviewRes, paymentsRes, allocationRes] = await Promise.all([
      fetchAtinaForBff<AtinaAdminOverview>('/api/v1/admin/overview', session, { method: 'GET' }),
      fetchAtinaForBff<AtinaAdminPayment[]>(
        '/api/v1/admin/payments?status=processing&provider=manual&limit=50',
        session,
        { method: 'GET' },
      ),
      fetchAtinaForBff<RevenueAllocationSummary>('/api/v1/billing/revenue-allocation/summary', session),
    ]);

    overview = overviewRes.ok ? (overviewRes.data ?? null) : null;
    if (!overview) overviewError = overviewRes.message ?? `http_${overviewRes.status}`;
    if (paymentsRes.ok && Array.isArray(paymentsRes.data)) pendingPayments = paymentsRes.data;
    marketKpi = buildLiveMarketKpi(
      overview,
      allocationRes.ok ? (allocationRes.data ?? null) : null,
      overviewRes.ok,
    );
  }

  return (
    <AdminClient
      snapshot={snapshot}
      sessionUser={session?.user ?? null}
      isDemo={session?.demo ?? false}
      overview={overview}
      overviewError={overviewError}
      pendingPayments={pendingPayments}
      marketKpi={marketKpi}
    />
  );
}
