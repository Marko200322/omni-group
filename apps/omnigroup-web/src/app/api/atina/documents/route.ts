import { NextResponse } from 'next/server';
import { fetchAtinaForBff } from '@/lib/atina-bff';
import { getServerSession } from '@/lib/auth-session';

/** GET /api/atina/documents — client document library (invoices / payment receipts). */
export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session || session.demo) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '20') || 20));

  const r = await fetchAtinaForBff<unknown>(
    `/api/v1/documents?limit=${limit}&page=${page}`,
    session,
  );

  if (!r.ok) {
    return NextResponse.json({ ok: false, error: r.message ?? 'documents_failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, data: r.data });
}
