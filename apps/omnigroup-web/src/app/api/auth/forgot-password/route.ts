import { NextResponse } from 'next/server';
import { atinaForgotPassword } from '@/lib/atina-auth';
import { checkRateLimit, clientIpFromRequest } from '@/lib/bff-rate-limit';

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit(`forgot:${ip}`, 10, 60 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  let body: { email?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!email) {
    return NextResponse.json({ ok: false, error: 'email_required' }, { status: 400 });
  }

  try {
    const result = await atinaForgotPassword(email);
    return NextResponse.json({
      ok: true,
      message: result.message,
      ...(process.env.NODE_ENV !== 'production' && result.devToken ? { devToken: result.devToken } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'forgot_failed';
    const unreachable = message.includes('fetch') || message.includes('abort') || message.includes('ECONNREFUSED');
    return NextResponse.json(
      {
        ok: false,
        error: unreachable ? 'atina_unreachable' : 'forgot_failed',
        ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}),
      },
      { status: unreachable ? 503 : 502 },
    );
  }
}
