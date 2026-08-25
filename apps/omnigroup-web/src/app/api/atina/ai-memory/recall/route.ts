import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession, isAdminRole } from '@/lib/auth-session';

type RecallRow = {
  id?: string;
  action?: string;
  context?: string;
  created_at?: string;
};

type RecallPayload = RecallRow[] | { local?: RecallRow[]; remote?: unknown };

function normalizeRecallItems(data: RecallPayload | null | undefined): RecallRow[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.local)) return data.local;
  return [];
}

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const url = new URL(req.url);
  const namespace = url.searchParams.get('namespace')?.trim() || 'global';
  const key = url.searchParams.get('key')?.trim() || '';

  const qs = new URLSearchParams({ namespace });
  if (key) qs.set('key', key);

  const r = await fetchAtinaForBff<RecallPayload>(
    `/api/v1/ai-memory/recall?${qs.toString()}`,
    session,
    { method: 'GET' },
  );

  if (!r.ok) {
    const unreachable = r.message?.includes('fetch') || r.status === 503;
    return clientSafeBffError(
      unreachable ? 'atina_unreachable' : 'recall_failed',
      r.message,
      unreachable ? 503 : r.status || 502,
    );
  }

  return NextResponse.json({ ok: true, items: normalizeRecallItems(r.data) });
}
