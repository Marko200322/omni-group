import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { fetchAtinaAuthenticated } from '@/lib/atina-auth';

type RecallRow = {
  id?: string;
  action?: string;
  context?: string;
  created_at?: string;
};

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const namespace = url.searchParams.get('namespace')?.trim() || 'global';
  const key = url.searchParams.get('key')?.trim() || '';

  const qs = new URLSearchParams({ namespace });
  if (key) qs.set('key', key);

  const r = await fetchAtinaAuthenticated<RecallRow[]>(
    `/api/v1/ai-memory/recall?${qs.toString()}`,
    session,
    { method: 'GET' },
  );

  if (!r.ok) {
    const unreachable = r.message?.includes('fetch') || r.status === 503;
    return NextResponse.json(
      {
        ok: false,
        error: unreachable ? 'atina_unreachable' : 'recall_failed',
        detail: r.message,
      },
      { status: unreachable ? 503 : r.status || 502 },
    );
  }

  return NextResponse.json({ ok: true, items: r.data ?? [] });
}
