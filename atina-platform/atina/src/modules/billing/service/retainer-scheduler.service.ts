import { config } from '../../../config';
import logger from '../../../utils/logger';
import { DeliverableFulfillmentRepository } from '../repository/deliverable-fulfillment.repository';
import { ClientDeliverableBootstrapService } from './client-deliverable-bootstrap.service';
import { persistSupportHealthCheck } from '../lib/deliverable-handlers/artifact-helpers';
import type { FulfillmentArtifact, FulfillmentContext } from '../lib/deliverable-handlers/types';
import { getSlackNotifier } from '../../../utils/slack-notifier.service';

const MONTHLY_MS = 30 * 24 * 60 * 60 * 1000;

let intervalHandle: NodeJS.Timeout | null = null;
let running = false;

export class RetainerSchedulerService {
  private readonly repo = new DeliverableFulfillmentRepository();
  private readonly bootstrap = new ClientDeliverableBootstrapService();

  start(): void {
    if (intervalHandle || !config.retainerScheduler.enabled) return;
    const ms = config.retainerScheduler.intervalMs;
    intervalHandle = setInterval(() => {
      void this.tick().catch((err) => {
        logger.warn('Retainer scheduler tick failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, ms);
    logger.info('Retainer scheduler started', { intervalMs: ms });
    void this.tick().catch(() => undefined);
  }

  stop(): void {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = null;
  }

  async tick(): Promise<{ processed: number }> {
    if (running) return { processed: 0 };
    running = true;
    let processed = 0;
    try {
      const jobs = await this.repo.listCompletedRetainers('lead-gen-retainer');
      const now = Date.now();
      for (const job of jobs) {
        const result = (job.result ?? {}) as Record<string, unknown>;
        const meta =
          typeof result.metadata === 'object' && result.metadata && !Array.isArray(result.metadata)
            ? (result.metadata as Record<string, unknown>)
            : {};
        const lastRunRaw = meta.lastMonthlyLeadGenAt ?? meta.lastMonthlyRunAt;
        const lastRun = lastRunRaw ? new Date(String(lastRunRaw)).getTime() : 0;
        if (lastRun && now - lastRun < MONTHLY_MS) continue;

        const industryCategory =
          typeof meta.industryCategory === 'string' ? meta.industryCategory : null;
        const stats = await this.bootstrap.runLeadGenKickoff({
          userId: job.user_id,
          industryCategory,
        });

        await this.repo.patchResultMetadata(job.payment_id, {
          metadata: {
            ...meta,
            leadGenStats: stats,
            lastMonthlyLeadGenAt: new Date().toISOString(),
          },
        });

        await getSlackNotifier().notify({
          text: `Monthly lead-gen refresh: mode=${stats.mode}, live_leads=${stats.leadsGenerated}, user=${job.user_id.slice(0, 8)}`,
        });
        processed += 1;
      }

      processed += await this.refreshSupportHealthChecks(now);
    } finally {
      running = false;
    }
    if (processed > 0) {
      logger.info('Retainer scheduler processed monthly lead-gen runs', { processed });
    }
    return { processed };
  }

  /** Monthly health-check PDF for support retainers — the card claims this, kickoff PDF is not enough. */
  private async refreshSupportHealthChecks(now: number): Promise<number> {
    let processed = 0;
    for (const deliverableId of ['support-priority', 'support-dedicated'] as const) {
      const jobs = await this.repo.listCompletedRetainers(deliverableId);
      for (const job of jobs) {
        const result = (job.result ?? {}) as Record<string, unknown>;
        const meta = metadataOf(result);
        const lastRunRaw = meta.lastMonthlyHealthCheckAt;
        const lastRun = lastRunRaw ? new Date(String(lastRunRaw)).getTime() : 0;
        if (lastRun && now - lastRun < MONTHLY_MS) continue;

        const slaHours = deliverableId === 'support-dedicated' ? 8 : 24;
        const clientName =
          typeof meta.clientName === 'string' && meta.clientName.trim()
            ? meta.clientName.trim()
            : 'Client';
        const industryCategory =
          typeof meta.industryCategory === 'string' ? meta.industryCategory : null;
        const period = new Date(now).toISOString().slice(0, 7);
        const ctx: FulfillmentContext = {
          paymentId: job.payment_id,
          userId: job.user_id,
          deliverableId,
          jobId: job.id,
          clientName,
          industryCategory,
          purchaseType: 'deliverable',
        };
        const fresh = await persistSupportHealthCheck({
          ctx,
          slaHours,
          kickoffTicketId: typeof meta.kickoffTicketId === 'string' ? meta.kickoffTicketId : null,
          periodLabel: period,
          filenameStem: `${deliverableId}-health-check-${period}`,
        });
        const artifacts = mergeArtifacts(result.artifacts, fresh);
        await this.repo.patchResultMetadata(job.payment_id, {
          artifacts,
          metadata: {
            ...meta,
            lastMonthlyHealthCheckAt: new Date(now).toISOString(),
            clientName,
          },
        });
        processed += 1;
      }
    }
    return processed;
  }
}

function metadataOf(result: Record<string, unknown>): Record<string, unknown> {
  const meta = result.metadata;
  return typeof meta === 'object' && meta && !Array.isArray(meta)
    ? { ...(meta as Record<string, unknown>) }
    : {};
}

function mergeArtifacts(existing: unknown, fresh: FulfillmentArtifact[]): FulfillmentArtifact[] {
  const prior = Array.isArray(existing) ? (existing as FulfillmentArtifact[]) : [];
  const names = new Set(fresh.map((a) => a.filename));
  return [...prior.filter((a) => a && !names.has(a.filename)), ...fresh];
}

let defaultScheduler: RetainerSchedulerService | undefined;

export function getRetainerScheduler(): RetainerSchedulerService {
  if (!defaultScheduler) defaultScheduler = new RetainerSchedulerService();
  return defaultScheduler;
}

export function stopRetainerScheduler(): void {
  getRetainerScheduler().stop();
}
