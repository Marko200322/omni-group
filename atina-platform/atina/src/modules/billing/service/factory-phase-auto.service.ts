/**
 * Evaluates effective factory phase, caches it, notifies admin on advance.
 */
import fs from 'fs';
import path from 'path';
import logger from '../../../utils/logger';
import { adminOpsNotifier } from '../../admin/service/admin-ops-notifier.service';
import {
  getFactoryPhaseCeiling,
  isFactoryPhaseAutoEnabled,
  resolveEffectiveFactoryPhase,
  type EffectivePhaseBreakdown,
  type FactoryRevenueMetrics,
} from '../lib/factory-phase-effective';
import { phaseIndex, type FactoryPhase } from '../lib/factory-phase';
import { FactoryPhaseMetricsRepository } from '../repository/factory-phase-metrics.repository';

type PersistedAutoState = {
  lastNotifiedPhase: FactoryPhase;
  lastEffectivePhase: FactoryPhase;
  updatedAt: string;
};

const DEFAULT_METRICS: FactoryRevenueMetrics = {
  confirmedPaymentCount: 0,
  confirmedRevenueEur: 0,
  fulfilledPackageCount: 0,
  estimatedMrrEur: 0,
};

let cachedBreakdown: EffectivePhaseBreakdown | null = null;
let intervalHandle: ReturnType<typeof setInterval> | null = null;

function stateFilePath(): string {
  const base = process.env.FACTORY_PHASE_AUTO_STATE_PATH?.trim();
  if (base) return base;
  return path.join(process.cwd(), 'data', 'factory-phase-auto-state.json');
}

function readState(): PersistedAutoState | null {
  try {
    const p = stateFilePath();
    if (!fs.existsSync(p)) return null;
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as PersistedAutoState;
    if (!raw?.lastNotifiedPhase) return null;
    return raw;
  } catch {
    return null;
  }
}

function writeState(state: PersistedAutoState): void {
  try {
    const p = stateFilePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    logger.warn('Failed to persist factory phase auto state', { error });
  }
}

export class FactoryPhaseAutoService {
  private readonly metricsRepo = new FactoryPhaseMetricsRepository();

  getCachedEffectivePhase(): FactoryPhase {
    if (cachedBreakdown) return cachedBreakdown.effective;
    if (!isFactoryPhaseAutoEnabled()) return getFactoryPhaseCeiling();
    // Until first DB evaluate: compute from keys + zero revenue (safe floor)
    return resolveEffectiveFactoryPhase(DEFAULT_METRICS).effective;
  }

  getCachedBreakdown(): EffectivePhaseBreakdown | null {
    return cachedBreakdown;
  }

  async evaluate(options?: { notify?: boolean }): Promise<EffectivePhaseBreakdown> {
    const metrics = await this.metricsRepo.loadMetrics();
    const breakdown = resolveEffectiveFactoryPhase(metrics);
    cachedBreakdown = breakdown;

    const notify = options?.notify !== false;
    if (notify && isFactoryPhaseAutoEnabled()) {
      await this.maybeNotifyAdvance(breakdown);
    } else {
      // Still persist effective for observability
      const prev = readState();
      writeState({
        lastNotifiedPhase: prev?.lastNotifiedPhase ?? breakdown.effective,
        lastEffectivePhase: breakdown.effective,
        updatedAt: new Date().toISOString(),
      });
    }

    return breakdown;
  }

  private async maybeNotifyAdvance(breakdown: EffectivePhaseBreakdown): Promise<void> {
    const prev = readState();
    const lastNotified = prev?.lastNotifiedPhase ?? 'M0';
    const advanced = phaseIndex(breakdown.effective) > phaseIndex(lastNotified);

    writeState({
      lastNotifiedPhase: advanced ? breakdown.effective : lastNotified,
      lastEffectivePhase: breakdown.effective,
      updatedAt: new Date().toISOString(),
    });

    if (!advanced) return;

    await adminOpsNotifier.notify('factory_phase_advanced', [
      `Effective factory phase: ${lastNotified} → ${breakdown.effective}`,
      `Ceiling: ${breakdown.ceiling} · AUTO=${breakdown.autoEnabled}`,
      `Confirmed payments: ${breakdown.metrics.confirmedPaymentCount}`,
      `Revenue €: ${breakdown.metrics.confirmedRevenueEur.toFixed(0)} · MRR €: ${breakdown.metrics.estimatedMrrEur.toFixed(0)}`,
      `Fulfilled packages: ${breakdown.metrics.fulfilledPackageCount}`,
      breakdown.blockedNext
        ? `Next blocked: ${breakdown.blockedNext} — ${breakdown.blockedReason ?? ''}`
        : 'At ceiling or fully unlocked',
    ]);

    logger.info('Factory phase advanced (AUTO)', {
      from: lastNotified,
      to: breakdown.effective,
    });
  }

  startPeriodicEvaluation(intervalMs = 15 * 60 * 1000): void {
    if (intervalHandle) return;
    void this.evaluate().catch((error) => {
      logger.warn('Initial factory phase auto evaluate failed', { error });
    });
    intervalHandle = setInterval(() => {
      void this.evaluate().catch((error) => {
        logger.warn('Periodic factory phase auto evaluate failed', { error });
      });
    }, intervalMs);
    if (typeof intervalHandle.unref === 'function') intervalHandle.unref();
  }

  stopPeriodicEvaluation(): void {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
  }
}

export const factoryPhaseAutoService = new FactoryPhaseAutoService();

/** Test helper */
export function __resetFactoryPhaseAutoCacheForTests(): void {
  cachedBreakdown = null;
}

export function __setFactoryPhaseAutoCacheForTests(breakdown: EffectivePhaseBreakdown | null): void {
  cachedBreakdown = breakdown;
}

export { DEFAULT_METRICS };
