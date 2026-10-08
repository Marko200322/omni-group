import fs from 'fs';
import path from 'path';
import { config } from '../../../config';
import logger from '../../../utils/logger';
import { getLeadDatabaseService } from '../../../integrations/lead-database.service';
import { resolveLeadGenChannelStatuses } from './client-deliverable-bootstrap.service';
import { isLiveHarvestOnKickoffEnabled } from '../lib/lead-gen-ops-pack';
import {
  applyHotHuntResult,
  buildLeadMachineStatus,
  emptyLeadMachineState,
  planIndustryHunt,
  selectIndustriesForTick,
  type LeadMachineRuntimeConfig,
  type LeadMachineState,
  type LeadMachineStatus,
} from '../lib/lead-machine-continuous';

let intervalHandle: NodeJS.Timeout | null = null;
let running = false;
let state: LeadMachineState = emptyLeadMachineState();

function stateFilePath(): string {
  const root = path.resolve(process.cwd(), 'data');
  return path.join(root, 'lead-machine-state.json');
}

function loadState(): LeadMachineState {
  try {
    const p = stateFilePath();
    if (!fs.existsSync(p)) return emptyLeadMachineState();
    const raw = JSON.parse(fs.readFileSync(p, 'utf8')) as Partial<LeadMachineState>;
    return { ...emptyLeadMachineState(), ...raw };
  } catch {
    return emptyLeadMachineState();
  }
}

function saveState(next: LeadMachineState): void {
  try {
    const p = stateFilePath();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf8');
  } catch (err) {
    logger.warn('Lead machine state persist failed', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

function runtimeConfig(): LeadMachineRuntimeConfig {
  return {
    continuousEnabled: config.leadMachine.continuousEnabled,
    autoWhenFunded: config.leadMachine.autoWhenFunded,
    monthlyBudgetEur: config.leadMachine.monthlyBudgetEur,
    industriesPerTick: config.leadMachine.industriesPerTick,
    dailyIndustryCap: config.leadMachine.dailyIndustryCap,
    intervalMs: config.leadMachine.intervalMs,
  };
}

export class LeadMachineSchedulerService {
  start(): void {
    if (intervalHandle) return;
    state = loadState();
    const ms = Math.max(60_000, runtimeConfig().intervalMs);
    intervalHandle = setInterval(() => {
      void this.tick().catch((err) => {
        logger.warn('Lead machine tick failed (continuing — no stall)', {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }, ms);
    logger.info('Lead machine continuous scheduler started', { intervalMs: ms });
    void this.tick().catch(() => undefined);
  }

  stop(): void {
    if (intervalHandle) clearInterval(intervalHandle);
    intervalHandle = null;
  }

  getStatus(): LeadMachineStatus {
    const svc = getLeadDatabaseService();
    const leadDb = svc.getStatus();
    const enrichmentConfigured = Object.values(leadDb.providers).some((p) => p.configured);
    return buildLeadMachineStatus({
      config: runtimeConfig(),
      leadDb,
      state,
      enrichmentConfigured,
    });
  }

  async tick(): Promise<{ processed: number; hotTotal: number; skipped: number }> {
    if (running) return { processed: 0, hotTotal: 0, skipped: 0 };
    running = true;
    let processed = 0;
    let hotTotal = 0;
    let skipped = 0;
    try {
      const cfg = runtimeConfig();
      const leadDb = getLeadDatabaseService();
      const dbStatus = leadDb.getStatus();
      const enrichmentConfigured = Object.values(dbStatus.providers).some((p) => p.configured);
      const status = buildLeadMachineStatus({
        config: cfg,
        leadDb: dbStatus,
        state,
        enrichmentConfigured,
      });

      if (!status.runnable) {
        state = { ...state, stalledReason: status.stalledReason, lastTickAt: new Date().toISOString() };
        saveState(state);
        return { processed: 0, hotTotal: 0, skipped: 0 };
      }

      // Continuous hunts use the same live-harvest honesty gate as kickoff
      // OR allow continuous flag to hunt when enrichment is active (budget path).
      const liveHarvest =
        isLiveHarvestOnKickoffEnabled() || cfg.continuousEnabled || cfg.autoWhenFunded;
      const enrichmentActive = leadDb.isEnrichmentActive();
      const channels = resolveLeadGenChannelStatuses();

      const selected = selectIndustriesForTick({
        state,
        industriesPerTick: cfg.industriesPerTick,
        dailyIndustryCap: cfg.dailyIndustryCap,
      });
      state = selected.state;

      if (!selected.industries.length) {
        state = {
          ...state,
          stalledReason: 'Daily industry hunt cap reached — resumes next UTC day',
          lastTickAt: new Date().toISOString(),
        };
        saveState(state);
        return { processed: 0, hotTotal: 0, skipped: 0 };
      }

      let cursor = selected.nextCursor;
      for (const ind of selected.industries) {
        try {
          const plan = planIndustryHunt({
            industrySlug: ind.slug,
            displayName: ind.name,
            channelStatuses: channels,
            liveHarvestEnabled: liveHarvest,
            enrichmentActive,
          });

          if (!plan.shouldHunt) {
            skipped += 1;
            const applied = applyHotHuntResult(state, {
              industrySlug: ind.slug,
              raw: [],
              analysis: plan.analysis,
              nextCursor: cursor,
              error: plan.huntReason,
            });
            state = applied.state;
            cursor = state.cursor;
            continue;
          }

          const raw = await leadDb.enrichFromHuntContext({
            verticalSlug: ind.slug,
            verticalName: plan.analysis.searchKeywords || ind.name,
          });
          const applied = applyHotHuntResult(state, {
            industrySlug: ind.slug,
            raw,
            analysis: plan.analysis,
            nextCursor: cursor,
          });
          state = applied.state;
          cursor = state.cursor;
          processed += 1;
          hotTotal += applied.hotCount;
          logger.info('Lead machine industry tick', {
            industry: ind.slug,
            packageId: plan.packageId,
            problems: plan.problemsSolved.length,
            raw: applied.rawCount,
            hot: applied.hotCount,
          });
        } catch (err) {
          // Fail-soft: advance cursor, never block the queue on one industry.
          skipped += 1;
          state = {
            ...state,
            cursor,
            lastIndustry: ind.slug,
            lastError: err instanceof Error ? err.message : String(err),
            lastTickAt: new Date().toISOString(),
            ticksCompleted: state.ticksCompleted + 1,
            industriesHuntedToday: state.industriesHuntedToday + 1,
            stalledReason: null,
          };
          logger.warn('Lead machine industry failed — continuing', {
            industry: ind.slug,
            error: state.lastError,
          });
        }
      }
      saveState(state);
    } finally {
      running = false;
    }
    return { processed, hotTotal, skipped };
  }
}

let singleton: LeadMachineSchedulerService | undefined;

export function getLeadMachineScheduler(): LeadMachineSchedulerService {
  if (!singleton) singleton = new LeadMachineSchedulerService();
  return singleton;
}

export function stopLeadMachineScheduler(): void {
  singleton?.stop();
}
