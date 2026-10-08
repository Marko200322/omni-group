import {
  applyHotHuntResult,
  buildLeadMachineStatus,
  emptyLeadMachineState,
  planIndustryHunt,
  resolveLeadMachineRunnable,
  selectIndustriesForTick,
  catalogProblemsFloorOk,
} from '../../modules/billing/lib/lead-machine-continuous';
import { keywordsFromProblemsSolved } from '../../modules/billing/lib/lead-gen-analysis-hunt';
import type { OutreachChannelStatus } from '../../modules/billing/lib/lead-gen-ops-pack';

describe('lead-machine-continuous', () => {
  const channelsConnected: OutreachChannelStatus[] = [
    { channel: 'apollo', status: 'CONNECTED', detail: 'key' },
    { channel: 'email', status: 'NOT CONNECTED', detail: 'smtp' },
    { channel: 'linkedin', status: 'NOT CONNECTED', detail: 'ads' },
    { channel: 'google_ads', status: 'NOT CONNECTED', detail: 'ads' },
    { channel: 'meta_ads', status: 'NOT CONNECTED', detail: 'ads' },
  ];

  it('keywordsFromProblemsSolved extracts searchable tokens', () => {
    const kws = keywordsFromProblemsSolved([
      'Healthcare: patient no-shows kill schedule density',
      'Billing: claim denials slow cash',
    ]);
    expect(kws.some((k) => k.includes('patient') || k.includes('no-shows'))).toBe(true);
    expect(kws.length).toBeGreaterThanOrEqual(2);
  });

  it('runnable when continuous + lead DB enrich + keys', () => {
    const r = resolveLeadMachineRunnable({
      config: {
        continuousEnabled: true,
        autoWhenFunded: false,
        monthlyBudgetEur: 0,
        industriesPerTick: 2,
        dailyIndustryCap: 40,
        intervalMs: 900_000,
      },
      leadDbEnabled: true,
      enrichOnHunt: true,
      enrichmentConfigured: true,
    });
    expect(r.runnable).toBe(true);
    expect(r.stalledReason).toBeNull();
  });

  it('auto-when-funded runs when budget > 0 even if continuous off', () => {
    const r = resolveLeadMachineRunnable({
      config: {
        continuousEnabled: false,
        autoWhenFunded: true,
        monthlyBudgetEur: 250,
        industriesPerTick: 2,
        dailyIndustryCap: 40,
        intervalMs: 900_000,
      },
      leadDbEnabled: true,
      enrichOnHunt: true,
      enrichmentConfigured: true,
    });
    expect(r.runnable).toBe(true);
  });

  it('stalls honestly without keys or phase', () => {
    expect(
      resolveLeadMachineRunnable({
        config: {
          continuousEnabled: true,
          autoWhenFunded: true,
          monthlyBudgetEur: 250,
          industriesPerTick: 2,
          dailyIndustryCap: 40,
          intervalMs: 900_000,
        },
        leadDbEnabled: false,
        enrichOnHunt: false,
        enrichmentConfigured: false,
      }).stalledReason,
    ).toMatch(/LEAD_DATABASE_ENABLED/);
  });

  it('plans industry hunt with ≥5 catalog problems and analysis', () => {
    const plan = planIndustryHunt({
      industrySlug: 'healthcare',
      displayName: 'Healthcare',
      channelStatuses: channelsConnected,
      liveHarvestEnabled: true,
      enrichmentActive: true,
    });
    expect(plan.packageId).toBe('lead-gen-retainer__healthcare');
    expect(plan.problemsSolved.length).toBeGreaterThanOrEqual(5);
    expect(plan.analysis.huntReady).toBe(true);
    expect(plan.shouldHunt).toBe(true);
    expect(plan.analysis.searchKeywords.length).toBeGreaterThan(0);
  });

  it('rotates industries without stalling and respects daily cap', () => {
    const state = emptyLeadMachineState();
    const a = selectIndustriesForTick({
      state,
      industriesPerTick: 2,
      dailyIndustryCap: 2,
    });
    expect(a.industries).toHaveLength(2);
    const b = selectIndustriesForTick({
      state: { ...a.state, industriesHuntedToday: 2 },
      industriesPerTick: 2,
      dailyIndustryCap: 2,
    });
    expect(b.industries).toHaveLength(0);
  });

  it('applyHotHuntResult advances cursor even when hot=0', () => {
    const state = emptyLeadMachineState();
    const plan = planIndustryHunt({
      industrySlug: 'construction',
      displayName: 'Construction',
      channelStatuses: channelsConnected,
      liveHarvestEnabled: true,
      enrichmentActive: true,
    });
    const applied = applyHotHuntResult(state, {
      industrySlug: 'construction',
      raw: [],
      analysis: plan.analysis,
      nextCursor: 3,
    });
    expect(applied.hotCount).toBe(0);
    expect(applied.state.cursor).toBe(3);
    expect(applied.state.industriesHuntedToday).toBe(1);
    expect(applied.state.stalledReason).toBeNull();
  });

  it('catalog problems floor ok for lead-gen-retainer industries', () => {
    expect(catalogProblemsFloorOk()).toBe(true);
  });

  it('status exposes stalledReason when not runnable', () => {
    const status = buildLeadMachineStatus({
      config: {
        continuousEnabled: false,
        autoWhenFunded: false,
        monthlyBudgetEur: 0,
        industriesPerTick: 2,
        dailyIndustryCap: 40,
        intervalMs: 900_000,
      },
      leadDb: {
        enabled: true,
        phase: 'F5',
        phaseLabel: 'Pun gas',
        enrichOnHunt: true,
        verifyOnHunt: true,
        verifyEmailsAvailable: true,
        requireVerifiedEmail: true,
        maxPerRun: 25,
        providerChain: ['apollo'],
        verifyChain: [],
        providers: { apollo: { configured: true } },
        emailVerifiers: {},
      },
      state: emptyLeadMachineState(),
      enrichmentConfigured: true,
    });
    expect(status.runnable).toBe(false);
    expect(status.stalledReason).toMatch(/CONTINUOUS|funded/i);
  });
});
