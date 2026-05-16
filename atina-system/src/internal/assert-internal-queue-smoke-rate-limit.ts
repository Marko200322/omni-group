import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

const buckets = new Map<string, number[]>();

/** Samo za Jest / e2e u istom Node procesu. */
export function resetInternalQueueSmokeRateLimitForTests(): void {
  buckets.clear();
}

function firstXForwardedForHop(
  raw: string | string[] | undefined,
): string | undefined {
  const takeHop = (segment: string): string | undefined => {
    const hop = segment.split(',')[0]?.trim();
    return hop && hop.length > 0 ? hop : undefined;
  };

  if (typeof raw === 'string') {
    return takeHop(raw);
  }
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry !== 'string') {
        continue;
      }
      const hop = takeHop(entry);
      if (hop) {
        return hop;
      }
    }
  }
  return undefined;
}

export function clientKeyFromQueueSmokeRequest(req: Request): string {
  const hop = firstXForwardedForHop(req.headers['x-forwarded-for']);
  if (hop) {
    return hop;
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function parseMaxPerWindow(): number {
  const raw = process.env.INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW?.trim();
  if (raw === undefined || raw === '') {
    return 60;
  }
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) {
    return 0;
  }
  return n;
}

function parseWindowMs(): number {
  const raw = process.env.INTERNAL_QUEUE_SMOKE_RATE_WINDOW_MS?.trim();
  const n = parseInt(raw ?? '60000', 10);
  if (!Number.isFinite(n) || n < 1000) {
    return 60000;
  }
  return n;
}

/**
 * Ograničava POST /internal/queue/smoke po klijentu (X-Forwarded-For prvi hop ili req.ip).
 * Isključeno: INTERNAL_QUEUE_SMOKE_RATE_MAX_PER_WINDOW=0 (ili negativno / NaN).
 * Podrazumevano: 60 zahteva po 60s prozoru.
 */
export function assertInternalQueueSmokeRateLimit(clientKey: string): void {
  const max = parseMaxPerWindow();
  if (max <= 0) {
    return;
  }
  const windowMs = parseWindowMs();
  const now = Date.now();
  const prev = buckets.get(clientKey) ?? [];
  const pruned = prev.filter((t) => now - t < windowMs);
  if (pruned.length >= max) {
    throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
  }
  pruned.push(now);
  buckets.set(clientKey, pruned);
}
