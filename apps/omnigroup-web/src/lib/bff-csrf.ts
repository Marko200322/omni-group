export const CSRF_COOKIE = 'og_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export const CSRF_EXEMPT_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/demo',
  '/api/contact',
  // Public pricing catalog — used from /pricing without a session
  '/api/atina/billing/quote',
  '/api/atina/billing/quotes',
]);

export function newCsrfToken(): string {
  return crypto.randomUUID();
}

export function csrfValid(cookieValue: string | undefined, headerValue: string | null): boolean {
  if (!cookieValue || !headerValue) return false;
  return cookieValue === headerValue;
}
