import { NextResponse } from 'next/server';
import { resolveAtinaApiBase } from '@/lib/atina-api-base';

export async function GET() {
  const apiBase = resolveAtinaApiBase();
  try {
    const res = await fetch(`${apiBase}/api/v1/billing/industry-catalog`, {
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
