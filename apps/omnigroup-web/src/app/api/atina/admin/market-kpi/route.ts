import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';
import {
  buildLiveMarketKpi,
  type RevenueAllocationSummary,
} from '@/lib/market-analytics';
import type { AtinaAdminOverview } from '@/lib/atina-live-types';

export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const [overviewRes, allocationRes] = await Promise.all([
    fetchAtinaForBff<AtinaAdminOverview>('/api/v1/admin/overview', session, { method: 'GET' }),
    fetchAtinaForBff<RevenueAllocationSummary>('/api/v1/billing/revenue-allocation/summary', session),
  ]);

  const apiAvailable = overviewRes.ok;
  const kpi = buildLiveMarketKpi(
    overviewRes.ok ? (overviewRes.data ?? null) : null,
    allocationRes.ok ? (allocationRes.data ?? null) : null,
    apiAvailable,
  );

  return NextResponse.json({
    ok: true,
    data: kpi,
    errors: [
      !overviewRes.ok ? overviewRes.message : null,
      !allocationRes.ok ? allocationRes.message : null,
    ].filter(Boolean),
  });
}
