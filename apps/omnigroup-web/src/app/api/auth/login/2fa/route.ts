import { NextResponse } from 'next/server';
import { atinaCompleteTwoFactorLogin } from '@/lib/atina-auth';
import { completeWebLogin } from '@/lib/complete-web-login';

const isDev = process.env.NODE_ENV !== 'production';

export async function POST(req: Request) {
  let body: { challengeToken?: string; code?: string; rememberMe?: boolean } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const challengeToken = typeof body.challengeToken === 'string' ? body.challengeToken.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!challengeToken || !code) {
    return NextResponse.json({ ok: false, error: 'code_required' }, { status: 400 });
  }

  let result;
  try {
    result = await atinaCompleteTwoFactorLogin({ challengeToken, code });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'login_failed';
    const unreachable = message.includes('fetch') || message.includes('abort') || message.includes('ECONNREFUSED');
    const invalidCode = /invalid authentication code/i.test(message);
    return NextResponse.json(
      {
        ok: false,
        error: unreachable ? 'atina_unreachable' : invalidCode ? 'invalid_code' : 'invalid_credentials',
        ...(isDev ? { detail: message } : {}),
      },
      { status: unreachable ? 503 : 401 },
    );
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
