import { NextResponse } from 'next/server';
import { resolveAtinaApiBase } from '@/lib/atina-api-base';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { slug } = await context.params;
  const apiBase = resolveAtinaApiBase();
  try {
    const res = await fetch(`${apiBase}/api/v1/autonomy-loop/verticals/${encodeURIComponent(slug)}/delivery-pack`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'upstream_failed' }, { status: res.status || 502 });
    }
    return NextResponse.json({ ok: true, data: json.data ?? json });
  } catch {
    return NextResponse.json({ ok: false, error: 'network_error' }, { status: 502 });
  }
}
