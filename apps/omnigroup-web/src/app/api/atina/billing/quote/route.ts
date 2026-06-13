import { NextResponse } from 'next/server';
import { resolveAtinaApiBase } from '@/lib/atina-api-base';

export async function POST(req: Request) {
  const apiBase = resolveAtinaApiBase();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  try {
    const res = await fetch(`${apiBase}/api/v1/billing/quote`, {
      method: 'POST',
      cache: 'no-store',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { success?: boolean; data?: unknown };
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: 'upstream_failed', detail: json }, { status: res.status || 502 });
    }
    return NextResponse.json({ ok: true, data: json.data ?? json });
  } catch {
    return NextResponse.json({ ok: false, error: 'network_error' }, { status: 502 });
  }
}
