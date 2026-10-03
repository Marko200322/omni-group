/**
 * Integer-cents ledger helpers.
 * Ledger math MUST stay in integer cents. Floats are only for display (EUR).
 */

export function assertCents(value: number, label = 'cents'): number {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer (cents), got ${value}`);
  }
  return value;
}

export function addCents(...values: number[]): number {
  let sum = 0;
  for (const v of values) {
    sum += assertCents(v);
  }
  return sum;
}

export function subCents(a: number, b: number): number {
  return assertCents(a) - assertCents(b);
}

export function mulCentsByInt(cents: number, factor: number): number {
  if (!Number.isInteger(factor)) {
    throw new Error(`factor must be an integer, got ${factor}`);
  }
  return assertCents(cents) * factor;
}

/** Apply basis points to cents. 10_000 bps = 100%. Half-up rounding in integer space. */
export function applyBps(amountCents: number, bps: number): number {
  assertCents(amountCents, 'amountCents');
  if (!Number.isInteger(bps)) {
    throw new Error(`bps must be an integer, got ${bps}`);
  }
  if (bps < 0) {
    throw new Error(`bps must be >= 0, got ${bps}`);
  }
  const product = BigInt(amountCents) * BigInt(bps);
  const denom = 10_000n;
  const half = denom / 2n;
  const sign = product < 0n ? -1n : 1n;
  const abs = product < 0n ? -product : product;
  const rounded = (abs + half) / denom;
  return Number(sign * rounded);
}

/** Display-only: cents → EUR float. Do not feed back into ledger math. */
export function centsToEur(cents: number): number {
  return assertCents(cents) / 100;
}

/** Display-only: round EUR to 2 decimal places. */
export function roundEur(eur: number): number {
  if (!Number.isFinite(eur)) return 0;
  return Math.round(eur * 100) / 100;
}

/** Display ingress only: EUR → cents. Prefer storing cents at the boundary. */
export function eurToCents(eur: number): number {
  if (!Number.isFinite(eur)) return 0;
  return Math.round(eur * 100);
}

/**
 * Duplicate-safe idempotency key.
 * Format: `ri:{scope}:{stableParts joined by ':'}`.
 */
export function buildIdempotencyKey(scope: string, ...stableParts: Array<string | number>): string {
  const safeScope = String(scope).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const parts = stableParts.map((p) =>
    String(p)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '_'),
  );
  return ['ri', safeScope, ...parts].join(':');
}
