import AdminClient from './AdminClient';
import { loadAtinaPublicSnapshot } from '@/lib/atina';
import { fetchAtinaAdminOverview } from '@/lib/atina-admin';
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
  let pendingPayments: AtinaAdminPayment[] = [];
  let marketKpi = buildLiveMarketKpi(null, null, false);

  if (isAdmin && session) {
    overview = (await fetchAtinaAdminOverview(session)).overview;

    const pr = await fetchAtinaForBff<AtinaAdminPayment[]>(
      '/api/v1/admin/payments?status=processing&provider=manual&limit=50',
      session,
      { method: 'GET' },
    );
    if (pr.ok && Array.isArray(pr.data)) pendingPayments = pr.data;

    const [overviewRes, allocationRes] = await Promise.all([
      fetchAtinaForBff<AtinaAdminOverview>('/api/v1/admin/overview', session, { method: 'GET' }),
      fetchAtinaForBff<RevenueAllocationSummary>('/api/v1/billing/revenue-allocation/summary', session),
    ]);
    marketKpi = buildLiveMarketKpi(
      overviewRes.ok ? (overviewRes.data ?? null) : overview,
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
      pendingPayments={pendingPayments}
      marketKpi={marketKpi}
    />
  );
}
