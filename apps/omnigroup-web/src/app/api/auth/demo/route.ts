import { NextResponse } from 'next/server';
import { buildDemoSession, setSessionCookie } from '@/lib/auth-session';

export async function POST(req: Request) {
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
