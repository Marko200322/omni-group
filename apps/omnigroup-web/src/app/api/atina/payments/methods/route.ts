import { NextResponse } from 'next/server';
import { resolveAtinaApiBase } from '@/lib/atina-api-base';

export async function GET() {
  const base = resolveAtinaApiBase();
  try {
    const res = await fetch(`${base}/api/v1/payments/methods`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const body = (await res.json()) as { success?: boolean; data?: unknown; message?: string };
    if (!res.ok || body.success === false) {
      return NextResponse.json({ ok: false, error: body.message ?? 'methods_failed' }, { status: res.status || 502 });
    }
    return NextResponse.json({ ok: true, data: body.data });
  } catch {
    return NextResponse.json({ ok: false, error: 'atina_unreachable' }, { status: 503 });
  }
}
