import type { AuthSession } from './auth-session';

const DEFAULT_API_BASE = 'http://127.0.0.1:3000';
const DEFAULT_TIMEOUT_MS = 8000;

export type AtinaLoginUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  planSlug: string | null;
  isEmailVerified: boolean;
};

export type AtinaLoginResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AtinaLoginUser;
};

type AtinaEnvelope<T> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: { code?: string; message?: string };
};

function resolveApiBase(): string {
  const raw = process.env.NEXT_PUBLIC_ATINA_API_BASE ?? DEFAULT_API_BASE;
  return raw.replace(/\/+$/, '');
}

async function fetchAtina<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; data: T | null; message?: string }> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${resolveApiBase()}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(rest.headers ?? {}),
      },
      cache: 'no-store',
    });
    let body: AtinaEnvelope<T> | null = null;
    try {
      body = (await res.json()) as AtinaEnvelope<T>;
    } catch {
      body = null;
    }
    const data = body?.data ?? null;
    const message = body?.error?.message ?? body?.message;
    return { ok: res.ok && body?.success !== false, status: res.status, data, message };
  } finally {
    clearTimeout(timer);
  }
}

export async function atinaLogin(input: {
  email: string;
  password: string;
  rememberMe?: boolean;
}): Promise<AtinaLoginResult> {
  const r = await fetchAtina<AtinaLoginResult>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      rememberMe: input.rememberMe ?? false,
    }),
  });
  if (!r.ok || !r.data?.accessToken || !r.data.refreshToken || !r.data.user) {
    throw new Error(r.message ?? `login_failed_${r.status}`);
  }
  return r.data;
}

export async function atinaLogout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await fetchAtina<null>('/api/v1/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function fetchAtinaAuthenticated<T>(
  path: string,
  session: AuthSession,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: T | null; message?: string }> {
  if (!session.accessToken) {
    return { ok: false, status: 401, data: null, message: 'no_access_token' };
  }
  return fetchAtina<T>(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${session.accessToken}`,
    },
  });
}

export async function fetchUnreadNotificationCount(
  session: AuthSession,
): Promise<{ count: number | null; error?: string }> {
  const r = await fetchAtinaAuthenticated<{ count?: number; unread?: number }>(
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
