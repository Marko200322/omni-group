import type { AuthSession } from './auth-session';
import { resolveAtinaApiBase } from './atina-api-base';

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
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  error?: { code?: string; message?: string };
};

export type AtinaFetchMeta = NonNullable<AtinaEnvelope<unknown>['meta']>;

function resolveApiBase(): string {
  return resolveAtinaApiBase(DEFAULT_API_BASE);
}

async function fetchAtina<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; data: T | null; meta?: AtinaFetchMeta; message?: string }> {
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
    return {
      ok: res.ok && body?.success !== false,
      status: res.status,
      data,
      meta: body?.meta,
      message,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function atinaRegister(input: {
  name: string;
  email: string;
  password: string;
  company?: string;
  timezone?: string;
}): Promise<AtinaLoginResult> {
  const r = await fetchAtina<AtinaLoginResult>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
      company: input.company?.trim() || undefined,
      timezone: input.timezone?.trim() || 'UTC',
    }),
  });
  if (!r.ok || !r.data?.accessToken || !r.data.refreshToken || !r.data.user) {
    throw new Error(r.message ?? `register_failed_${r.status}`);
  }
  return r.data;
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

export async function atinaRefreshTokens(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const r = await fetchAtina<{ accessToken: string; refreshToken: string; expiresIn?: string }>(
    '/api/v1/auth/refresh',
    {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    },
  );
  if (!r.ok || !r.data?.accessToken || !r.data.refreshToken) return null;
  return { accessToken: r.data.accessToken, refreshToken: r.data.refreshToken };
}

export async function atinaForgotPassword(email: string): Promise<{ message: string; devToken?: string }> {
  const r = await fetchAtina<{ message?: string; _devToken?: string }>('/api/v1/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (!r.ok) {
    throw new Error(r.message ?? `forgot_password_failed_${r.status}`);
  }
  return {
    message: r.data?.message ?? 'If this email exists, a reset link was sent',
    devToken: r.data?._devToken,
  };
}

export async function atinaResetPassword(token: string, password: string): Promise<void> {
  const r = await fetchAtina<null>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
  if (!r.ok) {
    throw new Error(r.message ?? `reset_password_failed_${r.status}`);
  }
}

export async function fetchAtinaAuthenticated<T>(
  path: string,
  session: AuthSession,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<{ ok: boolean; status: number; data: T | null; meta?: AtinaFetchMeta; message?: string }> {
  if (session.demo) {
    // Demo sessions are sandboxed and must never reach live backend endpoints.
    return { ok: false, status: 403, data: null, message: 'demo_session' };
  }
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
