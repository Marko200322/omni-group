import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

type CrmStats = {
  total?: number;
  byStatus?: Record<string, number>;
  recentActivity?: Array<{ id?: string; action?: string; created_at?: string }>;
};

export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const r = await fetchAtinaForBff<CrmStats>('/api/v1/crm/stats', session, { method: 'GET' });

  if (!r.ok) {
    return NextResponse.json(
      { ok: false, error: 'crm_stats_failed', detail: r.message },
      { status: r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, data: r.data });
}
