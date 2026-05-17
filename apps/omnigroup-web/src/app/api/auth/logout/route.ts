import { NextResponse } from 'next/server';
import { atinaLogout } from '@/lib/atina-auth';
import { clearSessionCookie, getServerSession } from '@/lib/auth-session';

export async function POST() {
  const session = await getServerSession();
  if (session?.refreshToken && !session.demo) {
    try {
      await atinaLogout(session.refreshToken);
    } catch {
      // Best-effort remote logout; local session still cleared.
    }
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
