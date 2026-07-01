import { NextResponse } from 'next/server';
import { resolveAtinaApiBase } from '@/lib/atina-api-base';

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;
  const apiBase = resolveAtinaApiBase();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  try {
    const res = await fetch(`${apiBase}/api/v1/public-site/client-sites/${encodeURIComponent(slug)}/orders`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const json = (await res.json()) as { success?: boolean; data?: unknown; error?: { message?: string } };
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: json.error?.message ?? 'order_failed' },
        { status: res.status || 502 },
      );
    }
    return NextResponse.json({ ok: true, data: json.data ?? json });
  } catch {
    return NextResponse.json({ ok: false, error: 'network_error' }, { status: 502 });
  }
}
