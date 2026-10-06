import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { resolveAtinaApiBase } from '@/lib/atina-api-base';

type Params = { params: Promise<{ paymentId: string; filename: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession();
  if (!session || session.demo || !session.accessToken) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const { paymentId, filename } = await params;
  const apiBase = resolveAtinaApiBase();
  const url = `${apiBase}/api/v1/billing/fulfillment/jobs/${paymentId}/artifacts/${encodeURIComponent(filename)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'artifact_download_failed' }, { status: res.status || 502 });
    }
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') ?? 'application/octet-stream';
    // Rebuild disposition from the route filename so non-ASCII upstream labels cannot break the BFF response.
    const safeName = String(filename || 'download').replace(/[^\x20-\x7E]/g, '_').replace(/[/\\?%*:|<>"]/g, '_') || 'download';
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeName}"`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'network_error' }, { status: 502 });
  }
}
