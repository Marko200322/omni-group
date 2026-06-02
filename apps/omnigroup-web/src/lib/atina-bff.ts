import 'server-only';

import type { AuthSession } from './auth-session';
import { setSessionCookie } from './auth-session';
import { atinaRefreshTokens, fetchAtinaAuthenticated, type AtinaFetchMeta } from './atina-auth';

/** BFF helper: retry once after refreshing JWT when Atina returns 401. */
export async function fetchAtinaForBff<T>(
  path: string,
  session: AuthSession,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  meta?: AtinaFetchMeta;
  message?: string;
  session: AuthSession;
}> {
  let current = session;
  let r = await fetchAtinaAuthenticated<T>(path, current, init);
  if (r.status === 401 && current.refreshToken && !current.demo) {
    const tokens = await atinaRefreshTokens(current.refreshToken);
    if (tokens) {
      current = { ...current, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
      await setSessionCookie(current);
      r = await fetchAtinaAuthenticated<T>(path, current, init);
    }
  }
  return { ...r, session: current };
}

export async function fetchUnreadNotificationCount(
  session: AuthSession,
): Promise<{ count: number | null; error?: string }> {
  const r = await fetchAtinaForBff<{ count?: number; unread?: number }>(
    '/api/v1/notifications/unread-count',
    session,
    { method: 'GET' },
  );
  if (!r.ok || !r.data) {
    return { count: null, error: r.message ?? `http_${r.status}` };
  }
  const raw = r.data.count ?? r.data.unread;
  return { count: typeof raw === 'number' ? raw : null };
}
