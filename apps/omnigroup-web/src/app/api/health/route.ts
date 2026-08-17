import { NextResponse } from 'next/server';
import { resolveAtinaApiBase } from '@/lib/atina-api-base';

export async function GET() {
  const atinaBase = resolveAtinaApiBase();
  let atina: { ok: boolean; status?: number; error?: string; url: string } = {
    ok: false,
    url: `${atinaBase}/health`,
  };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${atinaBase}/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    atina = { ok: res.ok, status: res.status, url: `${atinaBase}/health` };
  } catch (err) {
    atina.error = err instanceof Error ? err.message : 'unreachable';
  }

  return NextResponse.json({
    ok: atina.ok,
    app: 'omnigroup-web',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    atina: { ok: atina.ok, status: atina.status },
    ts: new Date().toISOString(),
  });
}

