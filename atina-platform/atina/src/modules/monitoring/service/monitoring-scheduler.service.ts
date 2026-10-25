import { config } from '../../../config';
import logger from '../../../utils/logger';
import { MonitoringService } from './monitoring.service';
import { MonitoringRepository } from '../repository/monitoring.repository';

let intervalHandle: NodeJS.Timeout | null = null;
let running = false;
let lastTickAt: string | null = null;
let lastTickOk = false;
let lastOverall: string | null = null;
let lastError: string | null = null;
let tickCount = 0;

const SYSTEM_ACTOR = { userId: '00000000-0000-0000-0000-000000000001', role: 'admin' };

/**
 * Periodic probe suite so admin Monitoring never goes stale (`no_recent_check`).
 * Fail-soft: never throws out of the interval; ticks skip overlap.
 */
export class MonitoringSchedulerService {
  private readonly service = new MonitoringService();
  private readonly repo = new MonitoringRepository();

  start(): void {
    if (intervalHandle || !config.monitoring.enabled || !config.monitoring.schedulerEnabled) {
      logger.info('Monitoring scheduler not started', {
        monitoringEnabled: config.monitoring.enabled,
        schedulerEnabled: config.monitoring.schedulerEnabled,
      });
      return;
    }
    const ms = Math.max(60_000, config.monitoring.schedulerIntervalMs);
    intervalHandle = setInterval(() => {
      void this.tick().catch((err) => {
        lastError = err instanceof Error ? err.message : String(err);
        lastTickOk = false;
        logger.warn('Monitoring scheduler tick failed', { error: lastError });
      });
    }, ms);
    logger.info('Monitoring scheduler started', { intervalMs: ms });
    void this.ensureMarketingService().catch(() => undefined);
    void this.tick().catch(() => undefined);
  }

  stop(): void {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = null;
  }

  getStatus() {
    return {
      running: Boolean(intervalHandle),
      enabled: config.monitoring.enabled && config.monitoring.schedulerEnabled,
      intervalMs: config.monitoring.schedulerIntervalMs,
      tickInFlight: running,
      tickCount,
      lastTickAt,
      lastTickOk,
      lastOverall,
      lastError,
    };
  }

  async tick(): Promise<{ ok: boolean; overall?: string }> {
    if (running) return { ok: false };
    if (!config.monitoring.enabled || !config.monitoring.schedulerEnabled) {
      return { ok: false };
    }
    running = true;
    try {
      await this.ensureMarketingService();
      const correlationId = `mon-cron-${Date.now().toString(36)}`;
      const result = await this.service.runEngine(SYSTEM_ACTOR, { correlationId });
      lastTickAt = new Date().toISOString();
      lastTickOk = true;
      lastOverall = result?.overall?.state ?? null;
      lastError = null;
      tickCount += 1;
      logger.info('Monitoring scheduler tick completed', {
        correlationId,
        overall: lastOverall,
        tickCount,
      });
      return { ok: true, overall: lastOverall ?? undefined };
    } finally {
      running = false;
    }
  }

  /** UI slot expects marketing; seed if migration not applied yet. */
  private async ensureMarketingService(): Promise<void> {
    try {
      await this.repo.ensureService({
        code: 'marketing',
        name: 'Marketing engine',
        layer: 'business',
        isCritical: false,
      });
    } catch (err) {
      logger.warn('ensureMarketingService failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

let singleton: MonitoringSchedulerService | undefined;

export function getMonitoringScheduler(): MonitoringSchedulerService {
  if (!singleton) singleton = new MonitoringSchedulerService();
  return singleton;
}

export function stopMonitoringScheduler(): void {
  getMonitoringScheduler().stop();
}
