import { NextResponse } from 'next/server';
import { clientSafeBffError } from '@/lib/atina-bff-route-handlers';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

/**
 * Client-scoped support KB recall.
 * The generic /api/atina/ai-memory/recall route is admin-only, so buyers
 * could not read the corpus their AI support retainer just wrote.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const r = await fetchAtinaForBff<unknown>(
    '/api/v1/ai-memory/recall?namespace=support-kb',
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

  return NextResponse.json({ ok: true, data: r.data ?? [] });
}
