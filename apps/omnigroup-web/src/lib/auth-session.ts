import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'og_session';

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export type AuthSession = {
  v: 1;
  demo: boolean;
  accessToken?: string;
  refreshToken?: string;
  user: SessionUser;
  exp: number;
};

const SESSION_VERSION = 1;
const DEMO_TTL_MS = 24 * 60 * 60 * 1000;
const AUTH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sessionSecret(): string {
  return (
    process.env.SESSION_SECRET ??
    process.env.AUTH_SESSION_SECRET ??
    (process.env.NODE_ENV === 'production' ? '' : 'omnigroup-dev-session-secret-change-me')
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLen);
  const binary = atob(base64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacSign(payloadB64: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  return toBase64Url(new Uint8Array(sig));
}

async function hmacVerify(payloadB64: string, signatureB64: string, secret: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const sigBytes = new Uint8Array(fromBase64Url(signatureB64));
  return crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(payloadB64),
  );
}

export async function sealSession(session: AuthSession): Promise<string> {
  const secret = sessionSecret();
  if (!secret) throw new Error('SESSION_SECRET is required in production');
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  const sig = await hmacSign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

export async function openSession(token: string | undefined | null): Promise<AuthSession | null> {
  if (!token) return null;
  const secret = sessionSecret();
  if (!secret) return null;

  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  const ok = await hmacVerify(payloadB64, sigB64, secret);
  if (!ok) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadB64));
    const parsed = JSON.parse(json) as AuthSession;
    if (parsed.v !== SESSION_VERSION) return null;
    if (!parsed.user?.email) return null;
    if (typeof parsed.exp !== 'number' || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildDemoSession(variant: 'client' | 'admin'): AuthSession {
  const isAdmin = variant === 'admin';
  return {
    v: SESSION_VERSION,
    demo: true,
    user: {
      id: isAdmin ? 'demo-admin' : 'demo-client',
      email: isAdmin ? 'admin.demo@omnigroup.local' : 'client.demo@omnigroup.local',
      name: isAdmin ? 'Demo Operator' : 'Demo Client',
      role: isAdmin ? 'admin' : 'user',
    },
    exp: Date.now() + DEMO_TTL_MS,
  };
}

export function buildAuthSession(input: {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
  rememberMe?: boolean;
}): AuthSession {
  const ttl = input.rememberMe ? 30 * 24 * 60 * 60 * 1000 : AUTH_TTL_MS;
  return {
    v: SESSION_VERSION,
    demo: false,
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
    user: input.user,
    exp: Date.now() + ttl,
  };
}

function sessionCookieSecure(): boolean {
  const flag = (process.env.COOKIE_SECURE ?? '').trim().toLowerCase();
  if (flag === 'false' || flag === '0') return false;
  if (flag === 'true' || flag === '1') return true;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? '').trim().toLowerCase();
  if (site.startsWith('https://')) return true;
  if (site.startsWith('http://')) return false;
  // Default to secure in production so the session cookie is never sent over
  // plain HTTP when the site URL is misconfigured/unset.
  return process.env.NODE_ENV === 'production';
}

export async function setSessionCookie(session: AuthSession): Promise<void> {
  const token = await sealSession(session);
  const maxAge = Math.max(60, Math.floor((session.exp - Date.now()) / 1000));
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  cookies().set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: sessionCookieSecure(),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getServerSession(): Promise<AuthSession | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return openSession(token);
}

export { isAdminRole } from './auth-roles';
