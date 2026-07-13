import { NextResponse } from 'next/server';
import { atinaRegister } from '@/lib/atina-auth';
import { buildAuthSession, setSessionCookie } from '@/lib/auth-session';

export async function POST(req: Request) {
  let body: {
    name?: string;
    email?: string;
    password?: string;
    company?: string;
    rememberMe?: boolean;
  } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const company = typeof body.company === 'string' ? body.company.trim() : undefined;

  if (!name || name.length < 2) {
    return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 });
  }
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'email_and_password_required' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: 'password_too_short' }, { status: 400 });
  }
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return NextResponse.json({ ok: false, error: 'password_requirements' }, { status: 400 });
  }

  try {
    const result = await atinaRegister({ name, email, password, company });
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

    return NextResponse.json({
      ok: true,
      redirectTo: '/dashboard',
      user: session.user,
      demo: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'register_failed';
    const unreachable = message.includes('fetch') || message.includes('abort') || message.includes('ECONNREFUSED');
    const conflict = message.toLowerCase().includes('already registered');
    return NextResponse.json(
      {
        ok: false,
        error: unreachable ? 'atina_unreachable' : conflict ? 'email_already_registered' : 'register_failed',
        detail: message,
      },
      { status: unreachable ? 503 : conflict ? 409 : 400 },
    );
  }
}
