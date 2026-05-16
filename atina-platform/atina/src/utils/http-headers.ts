import type { IncomingHttpHeaders } from 'http';

/**
 * Express may expose duplicate headers as `string[]`. Returns the first value, or `undefined`
 * when absent / empty array / first slot is nullish.
 */
export function headerFirst(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  const v = Array.isArray(value) ? value[0] : value;
  return v ?? undefined;
}

/**
 * When proxies or HTTP stacks join repeated header lines into one value, they often use comma separation.
 * Returns the first segment (trimmed), or `undefined` if absent / whitespace-only.
 */
export function firstCommaSegment(value: string | undefined): string | undefined {
  if (value == null) return undefined;
  const s = value.split(',')[0]?.trim();
  return s === '' || s === undefined ? undefined : s;
}

/**
 * Best-effort client IP: first hop in `X-Forwarded-For` (after `headerFirst` + `firstCommaSegment`),
 * otherwise the socket `remoteAddress`. Returns `''` when unknown — use `|| null` for nullable DB columns.
 */
export function clientIpFromForwardedFor(
  headers: IncomingHttpHeaders,
  remoteAddress: string | undefined
): string {
  return (
    firstCommaSegment(headerFirst(headers['x-forwarded-for'])) ||
    remoteAddress ||
    ''
  );
}
