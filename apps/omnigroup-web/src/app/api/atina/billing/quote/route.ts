import { NextResponse } from 'next/server';

const DEFAULT_API_BASE = 'http://127.0.0.1:3000';

export async function POST(req: Request) {
  const apiBase = (process.env.NEXT_PUBLIC_ATINA_API_BASE ?? DEFAULT_API_BASE).replace(/\/+$/, '');
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
