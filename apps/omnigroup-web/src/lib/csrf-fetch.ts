import { CSRF_COOKIE, CSRF_HEADER } from '@/lib/bff-csrf';

/** Read og_csrf from document.cookie (browser only). */
export function readCsrfToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === CSRF_COOKIE) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return rest.join('=');
      }
    }
  }
  return undefined;
}

export function withCsrfHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  const token = readCsrfToken();
  if (token && !headers.has(CSRF_HEADER)) {
    headers.set(CSRF_HEADER, token);
  }
  return headers;
}

/**
 * Same-origin fetch that attaches x-csrf-token on mutating methods.
 * Prefer this over bare fetch for /api/* POSTs from the browser.
 */
export function csrfFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const mutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
  if (!mutating) {
    return fetch(input, init);
  }
  return fetch(input, {
    credentials: init?.credentials ?? 'same-origin',
    ...init,
    headers: withCsrfHeaders(init?.headers),
  });
}
