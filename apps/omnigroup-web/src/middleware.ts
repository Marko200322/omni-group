import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, openSession, isAdminRole } from '@/lib/auth-session';

const PROTECTED_PREFIXES = ['/dashboard', '/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await openSession(token);
  if (!session) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') && !isAdminRole(session.user.role)) {
    const dashUrl = req.nextUrl.clone();
    dashUrl.pathname = '/dashboard';
    dashUrl.search = '';
    return NextResponse.redirect(dashUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
