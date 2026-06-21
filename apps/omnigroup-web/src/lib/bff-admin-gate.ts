import { NextResponse } from 'next/server';
import { getServerSession, isAdminRole, type AuthSession } from './auth-session';

export async function requireAdminSession():
  Promise<{ session: AuthSession } | { error: NextResponse }> {
  const session = await getServerSession();
  if (!session || session.demo) {
    return { error: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }) };
  }
  if (!isAdminRole(session.user.role)) {
    return { error: NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 }) };
  }
  return { session };
}
