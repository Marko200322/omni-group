import { NextResponse } from 'next/server';
import { atinaLogin } from '@/lib/atina-auth';
import { buildAuthSession, setSessionCookie } from '@/lib/auth-session';

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

  try {
    const result = await atinaLogin({ email, password, rememberMe: body.rememberMe });
    const session = buildAuthSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberMe: body.rememberMe,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
      },
    });
    await setSessionCookie(session);

    const redirectTo = '/dashboard';
    return NextResponse.json({
      ok: true,
      redirectTo,
      user: session.user,
      demo: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'login_failed';
    const unreachable = message.includes('fetch') || message.includes('abort') || message.includes('ECONNREFUSED');
    return NextResponse.json(
      {
        ok: false,
        error: unreachable ? 'atina_unreachable' : 'invalid_credentials',
        detail: message,
      },
      { status: unreachable ? 503 : 401 },
    );
  }
}
