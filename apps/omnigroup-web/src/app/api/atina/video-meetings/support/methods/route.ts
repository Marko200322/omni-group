import { NextResponse } from 'next/server';

export async function GET() {
  const base = (process.env.NEXT_PUBLIC_ATINA_API_BASE ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');
  try {
    const res = await fetch(`${base}/api/v1/video-meetings/support/methods`, {
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
