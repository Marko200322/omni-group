/**
 * Continuous lead machine for the ~1000 industry catalog.
 * Rotates industries, builds ICP from package problems, hunts hot leads only.
 * Fail-soft: one industry/provider failure never stalls the whole machine.
 */
import { INDUSTRY_CATEGORIES } from './category-pricing';
import { listResolvedPackageIndustryProblems } from './package-industry-problems';
import {
  buildLeadGenAnalysisPack,
  filterHotLeads,
  resolveLiveHuntGate,
  type LeadGenAnalysisPack,
} from './lead-gen-analysis-hunt';
import type { OutreachChannelStatus } from './lead-gen-ops-pack';
import { resolveVerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';
import type { LeadRecord } from '../../../integrations/lead-databases/types';
import type { LeadDatabaseStatus } from '../../../integrations/lead-database.service';
import { resolveLeadPhaseCapabilities } from '../../../integrations/lead-databases/phased-rollout';

export const LEAD_MACHINE_BASE_PACKAGE = 'lead-gen-retainer' as const;

export type LeadMachineRuntimeConfig = {
  continuousEnabled: boolean;
  autoWhenFunded: boolean;
  monthlyBudgetEur: number;
  industriesPerTick: number;
  dailyIndustryCap: number;
  intervalMs: number;
};

export type LeadMachineState = {
  cursor: number;
  dayKey: string;
  industriesHuntedToday: number;
  lastTickAt: string | null;
  lastIndustry: string | null;
  lastError: string | null;
  lastHotCount: number;
  lastRawCount: number;
  ticksCompleted: number;
  stalledReason: string | null;
};

export type LeadMachineStatus = {
  runnable: boolean;
  stalledReason: string | null;
  config: LeadMachineRuntimeConfig;
  leadDb: Pick<LeadDatabaseStatus, 'enabled' | 'phase' | 'phaseLabel' | 'enrichOnHunt' | 'maxPerRun'>;
  state: LeadMachineState;
  industryCount: number;
  catalogProblemsFloorOk: boolean;
};

export type LeadMachineIndustryPlan = {
  industrySlug: string;
  packageId: string;
  problemsSolved: string[];
  analysis: LeadGenAnalysisPack;
  shouldHunt: boolean;
  huntReason: string;
};

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function emptyLeadMachineState(): LeadMachineState {
  return {
    cursor: 0,
    dayKey: dayKey(),
    industriesHuntedToday: 0,
    lastTickAt: null,
    lastIndustry: null,
    lastError: null,
    lastHotCount: 0,
    lastRawCount: 0,
    ticksCompleted: 0,
    stalledReason: null,
  };
}

export function resolveLeadMachineRunnable(input: {
  config: LeadMachineRuntimeConfig;
  leadDbEnabled: boolean;
  enrichOnHunt: boolean;
  enrichmentConfigured: boolean;
}): { runnable: boolean; stalledReason: string | null } {
  if (!input.leadDbEnabled) {
    return { runnable: false, stalledReason: 'LEAD_DATABASE_ENABLED=false' };
  }
  if (!input.enrichOnHunt) {
    return {
      runnable: false,
      stalledReason: 'Lead phase below F3 (enrichOnHunt=false)',
    };
  }
  if (!input.enrichmentConfigured) {
    return {
      runnable: false,
      stalledReason: 'No Apollo/Hunter (or chain) API keys configured',
    };
  }
  if (input.config.continuousEnabled) {
    return { runnable: true, stalledReason: null };
  }
  if (input.config.autoWhenFunded && input.config.monthlyBudgetEur > 0) {
    return { runnable: true, stalledReason: null };
  }
  return {
    runnable: false,
    stalledReason:
      'LEAD_MACHINE_CONTINUOUS=false and auto-when-funded off (or monthlyBudgetEur=0)',
  };
}

/** Build a vertical pack for continuous hunts (catalog industry). */
export function buildIndustryHuntPack(industrySlug: string, displayName: string) {
  const label = displayName.trim() || industrySlug.replace(/_/g, ' ');
  return resolveVerticalDeliveryPack({
    slug: industrySlug,
    category: industrySlug,
    subtype: null,
    name: label,
  });
}

export function planIndustryHunt(input: {
  industrySlug: string;
  displayName: string;
  channelStatuses: OutreachChannelStatus[];
  liveHarvestEnabled: boolean;
  enrichmentActive: boolean;
}): LeadMachineIndustryPlan {
  const problemsSolved = listResolvedPackageIndustryProblems(
    LEAD_MACHINE_BASE_PACKAGE,
    input.industrySlug,
  );
  const pack = buildIndustryHuntPack(input.industrySlug, input.displayName);
  const analysis = buildLeadGenAnalysisPack({
    pack,
    channelStatuses: input.channelStatuses,
    problemsSolved,
  });
  const gate = resolveLiveHuntGate({
    analysis,
    liveHarvestEnabled: input.liveHarvestEnabled,
    enrichmentActive: input.enrichmentActive,
  });
  return {
    industrySlug: input.industrySlug,
    packageId: `${LEAD_MACHINE_BASE_PACKAGE}__${input.industrySlug}`,
    problemsSolved,
    analysis,
    shouldHunt: gate.shouldHunt,
    huntReason: gate.reason,
  };
}

export function selectIndustriesForTick(input: {
  state: LeadMachineState;
  industriesPerTick: number;
  dailyIndustryCap: number;
}): { industries: Array<{ slug: string; name: string }>; nextCursor: number; state: LeadMachineState } {
  const state = { ...input.state };
  const today = dayKey();
  if (state.dayKey !== today) {
    state.dayKey = today;
    state.industriesHuntedToday = 0;
  }
  const remaining = Math.max(0, input.dailyIndustryCap - state.industriesHuntedToday);
  const take = Math.min(input.industriesPerTick, remaining, INDUSTRY_CATEGORIES.length);
  const industries: Array<{ slug: string; name: string }> = [];
  let cursor = state.cursor % INDUSTRY_CATEGORIES.length;
  for (let i = 0; i < take; i += 1) {
    const cat = INDUSTRY_CATEGORIES[cursor % INDUSTRY_CATEGORIES.length];
    industries.push({ slug: cat.slug, name: cat.name });
    cursor = (cursor + 1) % INDUSTRY_CATEGORIES.length;
  }
  return { industries, nextCursor: cursor, state };
}

export function applyHotHuntResult(
  state: LeadMachineState,
  input: {
    industrySlug: string;
    raw: LeadRecord[];
    analysis: LeadGenAnalysisPack;
    nextCursor: number;
    error?: string | null;
  },
): { state: LeadMachineState; hotCount: number; rawCount: number } {
  const filter = filterHotLeads(input.raw, input.analysis, { huntedWithIcpKeywords: true });
  const next: LeadMachineState = {
    ...state,
    cursor: input.nextCursor,
    lastTickAt: new Date().toISOString(),
    lastIndustry: input.industrySlug,
    lastError: input.error ?? null,
    lastHotCount: filter.hotCount,
    lastRawCount: filter.rawCount,
    ticksCompleted: state.ticksCompleted + 1,
    industriesHuntedToday: state.industriesHuntedToday + 1,
    stalledReason: null,
  };
  return { state: next, hotCount: filter.hotCount, rawCount: filter.rawCount };
}

export function catalogProblemsFloorOk(): boolean {
  // Spot-check a few industries — continuous machine requires ≥5 problems each.
  const sample = INDUSTRY_CATEGORIES.slice(0, 5);
  return sample.every(
    (c) => listResolvedPackageIndustryProblems(LEAD_MACHINE_BASE_PACKAGE, c.slug).length >= 5,
  );
}

export function buildLeadMachineStatus(input: {
  config: LeadMachineRuntimeConfig;
  leadDb: LeadDatabaseStatus;
  state: LeadMachineState;
  enrichmentConfigured: boolean;
}): LeadMachineStatus {
  const caps = resolveLeadPhaseCapabilities();
  const { runnable, stalledReason } = resolveLeadMachineRunnable({
    config: input.config,
    leadDbEnabled: input.leadDb.enabled,
    enrichOnHunt: caps.enrichOnHunt,
    enrichmentConfigured: input.enrichmentConfigured,
  });
  return {
    runnable,
    stalledReason: runnable ? null : stalledReason,
    config: input.config,
    leadDb: {
      enabled: input.leadDb.enabled,
      phase: input.leadDb.phase,
      phaseLabel: input.leadDb.phaseLabel,
      enrichOnHunt: input.leadDb.enrichOnHunt,
      maxPerRun: input.leadDb.maxPerRun,
    },
    state: {
      ...input.state,
      stalledReason: runnable ? input.state.stalledReason : stalledReason,
    },
    industryCount: INDUSTRY_CATEGORIES.length,
    catalogProblemsFloorOk: catalogProblemsFloorOk(),
  };
}
