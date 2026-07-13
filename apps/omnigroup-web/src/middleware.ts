import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, openSession, isAdminRole } from '@/lib/auth-session';
import { CSRF_COOKIE, CSRF_EXEMPT_PATHS, csrfValid, newCsrfToken } from '@/lib/bff-csrf';
import { checkRateLimit, clientIpFromRequest } from '@/lib/bff-rate-limit';

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/dev'];
const AUTH_RATE_LIMIT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
]);

function sameOrigin(req: NextRequest): boolean {
  const host = req.headers.get('host');
  if (!host) return process.env.NODE_ENV !== 'production';
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }
  const referer = req.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }
  return process.env.NODE_ENV !== 'production';
}

function attachCsrfCookie(res: NextResponse, req: NextRequest): NextResponse {
  if (!req.cookies.get(CSRF_COOKIE)?.value) {
    res.cookies.set(CSRF_COOKIE, newCsrfToken(), {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    });
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/api/') && req.method !== 'GET' && req.method !== 'HEAD') {
    if (AUTH_RATE_LIMIT_PATHS.has(pathname)) {
      const ip = clientIpFromRequest(req);
      const max = Math.max(20, Number(process.env.BFF_AUTH_RATE_LIMIT_MAX || 20) || 20);
      const rl = checkRateLimit(`auth:${pathname}:${ip}`, max, 15 * 60 * 1000);
      if (!rl.allowed) {
        return NextResponse.json(
          { ok: false, error: 'rate_limited', retryAfterSec: rl.retryAfterSec },
          { status: 429 },
        );
      }
    }

    if (!CSRF_EXEMPT_PATHS.has(pathname)) {
      const cookie = req.cookies.get(CSRF_COOKIE)?.value;
      const header = req.headers.get('x-csrf-token');
      if (!csrfValid(cookie, header) && !sameOrigin(req)) {
        return NextResponse.json({ ok: false, error: 'csrf_invalid' }, { status: 403 });
      }
    }
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) {
    return attachCsrfCookie(NextResponse.next(), req);
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await openSession(token);
  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname + req.nextUrl.search);
    return attachCsrfCookie(NextResponse.redirect(loginUrl), req);
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/dev')) {
    if (session.demo && process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_AUTH !== 'true') {
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('next', pathname + req.nextUrl.search);
      return attachCsrfCookie(NextResponse.redirect(loginUrl), req);
    }
    if (!isAdminRole(session.user.role)) {
      const dashUrl = req.nextUrl.clone();
      dashUrl.pathname = '/dashboard';
      dashUrl.search = '';
      return attachCsrfCookie(NextResponse.redirect(dashUrl), req);
    }
  }

  return attachCsrfCookie(NextResponse.next(), req);
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/dev/:path*', '/api/:path*', '/login', '/register', '/forgot-password', '/reset-password'],
};
