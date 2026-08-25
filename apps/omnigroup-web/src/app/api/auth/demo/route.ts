import { NextResponse } from 'next/server';
import { buildDemoSession, setSessionCookie } from '@/lib/auth-session';

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_AUTH !== 'true') {
    return NextResponse.json({ ok: false, error: 'demo_disabled' }, { status: 403 });
  }

  let body: { variant?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }
  const variant = body.variant === 'admin' ? 'admin' : 'client';
  const session = buildDemoSession(variant);
  await setSessionCookie(session);
  return NextResponse.json({
    ok: true,
    redirectTo: '/dashboard',
    demo: true,
    user: session.user,
  });
}
