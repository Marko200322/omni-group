import { config } from '../../config';
import logger from '../../utils/logger';
import {
  getOmiUsageConfig,
  spendableBudgetUsd,
  type OmiUsageConfig,
} from './omi-usage-config';
import { getOmiUsageStore, type OmiUsageStore } from './omi-usage-store';

const ALERT_THRESHOLDS = [50, 75, 90, 100] as const;

type SpendSnapshot = { daily: number; monthly: number };

const lastAlerted = new Map<string, number>();

function alertKey(scope: 'daily' | 'monthly', pct: number, stamp: string): string {
  return `${scope}:${pct}:${stamp}`;
}

function dayStamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
}

function monthStamp(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function crossedThresholds(spent: number, spendable: number): number[] {
  if (spendable <= 0) return [100];
  const pct = (spent / spendable) * 100;
  return ALERT_THRESHOLDS.filter((t) => pct >= t);
}

async function sendBudgetEmail(subject: string, body: string, to: string): Promise<void> {
  try {
    // Lazy import to avoid circular deps with notifications module bootstrap.
    const { NotificationsService } = await import('../notifications/service/notifications.service');
    const svc = new NotificationsService();
    await svc.sendEmail(to, subject, `<p>${body}</p>`, body);
  } catch (err) {
    logger.warn('OMI budget alert email failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Fire-and-forget budget threshold alerts (50/75/90/100%) via existing email path.
 * Deduped per day/month stamp so each threshold emails at most once per period.
 */
export async function maybeAlertOmiBudget(
  spend: SpendSnapshot,
  cfg: OmiUsageConfig = getOmiUsageConfig(),
  store: OmiUsageStore = getOmiUsageStore(),
): Promise<void> {
  const to = cfg.alertEmail || config.admin.email;
  if (!to) return;

  const dailyCap = spendableBudgetUsd(cfg.dailyBudgetUsd, cfg.budgetReservePercent);
  const monthlyCap = spendableBudgetUsd(cfg.monthlyBudgetUsd, cfg.budgetReservePercent);
  const day = dayStamp();
  const month = monthStamp();

  const jobs: Array<{ scope: 'daily' | 'monthly'; pct: number; spent: number; cap: number; stamp: string }> =
    [];

  for (const pct of crossedThresholds(spend.daily, dailyCap)) {
    jobs.push({ scope: 'daily', pct, spent: spend.daily, cap: dailyCap, stamp: day });
  }
  for (const pct of crossedThresholds(spend.monthly, monthlyCap)) {
    jobs.push({ scope: 'monthly', pct, spent: spend.monthly, cap: monthlyCap, stamp: month });
  }

  for (const job of jobs) {
    const key = alertKey(job.scope, job.pct, job.stamp);
    if (lastAlerted.has(key)) continue;

    // Redis NX lock so multi-instance deploys don't spam.
    if (await store.ensureReady()) {
      try {
        const acquired = await store.setNx(`omi:alert:${key}`, 40 * 86400 * 1000);
        if (!acquired) {
          lastAlerted.set(key, Date.now());
          continue;
        }
      } catch {
        /* fall through to in-process dedupe */
      }
    }

    lastAlerted.set(key, Date.now());
    const subject = `[OMI] AI budget ${job.scope} ${job.pct}%`;
    const body =
      `OMI ${job.scope} AI spend reached ${job.pct}% of spendable budget ` +
      `($${job.spent.toFixed(4)} / $${job.cap.toFixed(2)} after ${cfg.budgetReservePercent}% reserve). ` +
      `App: ${config.app.name}.`;
    await sendBudgetEmail(subject, body, to);
    logger.warn('OMI budget threshold alert', {
      scope: job.scope,
      pct: job.pct,
      spent: job.spent,
      cap: job.cap,
    });
  }
}

/** Test helper */
export function resetOmiAlertDedupeForTests(): void {
  lastAlerted.clear();
}
