import { createHash } from 'crypto';
import { DEFAULT_ALERT_COOLDOWN_SEC } from './constants';

/** Stable dedupe key for alert/anomaly suppression windows. */
export function buildDedupeKey(service: string, title: string): string {
  const normalized = `${String(service).trim().toLowerCase()}|${String(title).trim().toLowerCase()}`;
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 24);
  return `mon:${hash}`;
}

/**
 * Returns true when an alert with the same dedupe key should be suppressed
 * because it fired within the cooldown window.
 */
export function shouldSuppress(
  lastAlertAt: Date | string | number | null | undefined,
  cooldownSec: number = DEFAULT_ALERT_COOLDOWN_SEC,
  now: Date | number = Date.now()
): boolean {
  if (lastAlertAt == null) return false;
  const lastMs =
    typeof lastAlertAt === 'number'
      ? lastAlertAt
      : lastAlertAt instanceof Date
        ? lastAlertAt.getTime()
        : new Date(lastAlertAt).getTime();
  if (!Number.isFinite(lastMs)) return false;
  const nowMs = typeof now === 'number' ? now : now.getTime();
  const cooldownMs = Math.max(0, cooldownSec) * 1000;
  return nowMs - lastMs < cooldownMs;
}
