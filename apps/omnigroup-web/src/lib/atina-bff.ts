import 'server-only';

import type { AuthSession } from './auth-session';
import { setSessionCookie } from './auth-session';
import { atinaRefreshTokens, fetchAtinaAuthenticated, type AtinaFetchMeta } from './atina-auth';
import { resolveAtinaApiBase } from './atina-api-base';

const PUBLIC_FETCH_TIMEOUT_MS = 8000;

/**
 * BFF helper for PUBLIC (unauthenticated) upstream GETs. Always applies a bounded
 * timeout so a hung backend cannot hang the Next.js request, and never leaks the
 * upstream error message to the client.
 */
export async function fetchAtinaPublicJson<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const { timeoutMs = PUBLIC_FETCH_TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${resolveAtinaApiBase()}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(rest.headers ?? {}) },
      cache: 'no-store',
    });
    let body: { success?: boolean; data?: T } | null = null;
    try {
      body = (await res.json()) as { success?: boolean; data?: T };
    } catch {
      body = null;
    }
    return {
      ok: res.ok && body?.success !== false,
      status: res.status || 502,
      data: body?.data ?? null,
    };
  } catch {
    return { ok: false, status: 503, data: null };
  } finally {
    clearTimeout(timer);
  }
}

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
