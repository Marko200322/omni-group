import { NextResponse } from 'next/server';
import { atinaLogin, isAtinaTwoFactorChallenge } from '@/lib/atina-auth';
import { completeWebLogin } from '@/lib/complete-web-login';

const isDev = process.env.NODE_ENV !== 'production';

export async function POST(req: Request) {
  let body: { email?: string; password?: string; rememberMe?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'email_and_password_required' }, { status: 400 });
  }

  let result;
  try {
    result = await atinaLogin({ email, password, rememberMe: body.rememberMe });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'login_failed';
    const unreachable = message.includes('fetch') || message.includes('abort') || message.includes('ECONNREFUSED');
    return NextResponse.json(
      {
        ok: false,
        error: unreachable ? 'atina_unreachable' : 'invalid_credentials',
        ...(isDev ? { detail: message } : {}),
      },
      { status: unreachable ? 503 : 401 },
    );
  }

  if (isAtinaTwoFactorChallenge(result)) {
    return NextResponse.json({
      ok: true,
      requiresTwoFactor: true,
      challengeToken: result.challengeToken,
    });
  }

  try {
    const { session, redirectTo } = await completeWebLogin(result, body.rememberMe);
    return NextResponse.json({
      ok: true,
      redirectTo,
      user: session.user,
      demo: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'session_error';
    return NextResponse.json(
      { ok: false, error: 'server_error', ...(isDev ? { detail: message } : {}) },
      { status: 500 },
    );
  }
}
