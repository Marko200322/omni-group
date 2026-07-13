import { NextResponse } from 'next/server';
import { atinaResetPassword } from '@/lib/atina-auth';
import { checkRateLimit, clientIpFromRequest } from '@/lib/bff-rate-limit';

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit(`reset:${ip}`, 15, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: { token?: string; password?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!token || !password) {
    return NextResponse.json({ ok: false, error: 'token_and_password_required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: 'password_too_short' }, { status: 400 });
  }

  try {
    await atinaResetPassword(token, password);
    return NextResponse.json({ ok: true, redirectTo: '/login' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'reset_failed';
    const unreachable = message.includes('fetch') || message.includes('abort') || message.includes('ECONNREFUSED');
    return NextResponse.json(
      { ok: false, error: unreachable ? 'atina_unreachable' : 'invalid_or_expired_token', detail: message },
      { status: unreachable ? 503 : 400 },
    );
  }
}
