/**
 * Deterministic lead-gen ops pack builders.
 * Same industry pack + channel statuses → same CRM stages, sequences, weekly plan, channel board.
 * Never invents live leads — live_harvest only when a real adapter returned contacts.
 */
import type { VerticalDeliveryPack } from '../../autonomy-loop/lib/vertical-delivery-resolver';

export const CRM_PIPELINE_STAGES = ['lead', 'prospect', 'customer'] as const;

export type ChannelConnectionStatus = 'CONNECTED' | 'NOT CONNECTED';

export type OutreachChannelStatus = {
  channel: 'linkedin' | 'google_ads' | 'apollo' | 'email' | 'meta_ads';
  status: ChannelConnectionStatus;
  detail: string;
};

export type LeadGenMode = 'live_harvest' | 'channels_ready' | 'kickoff_pack_only';

export type SequenceTemplate = {
  id: 'seq_a' | 'seq_b' | 'seq_c';
  name: string;
  day: number;
  subject: string;
  body: string;
  cta: string;
};

export type WeeklyPlanWeek = {
  week: 1 | 2 | 3 | 4;
  title: string;
  steps: string[];
};

const ENRICHMENT_CHANNELS = new Set(['apollo', 'linkedin', 'google_ads']);

function envFlagTrue(key: string): boolean {
  return ['true', '1', 'yes'].includes((process.env[key] ?? '').trim().toLowerCase());
}

/** Opt-in: call Apollo/Hunter/etc during kickoff (costs API credits). */
export function isLiveHarvestOnKickoffEnabled(): boolean {
  return envFlagTrue('LEAD_LIVE_HARVEST_ON_KICKOFF');
}

/**
 * Rule-based mode — never random.
 * live_harvest only when live contacts > 0 AND an enrichment channel is CONNECTED.
 */
export function resolveLeadGenMode(input: {
  channelStatuses: OutreachChannelStatus[];
  liveLeadsGenerated: number;
}): LeadGenMode {
  const live = Math.max(0, Math.floor(Number(input.liveLeadsGenerated) || 0));
  const enrichmentConnected = input.channelStatuses.some(
    (c) => ENRICHMENT_CHANNELS.has(c.channel) && c.status === 'CONNECTED',
  );

  if (live > 0 && enrichmentConnected) return 'live_harvest';

  const ready = input.channelStatuses.some(
    (c) => ENRICHMENT_CHANNELS.has(c.channel) && c.status === 'CONNECTED',
  );
  return ready ? 'channels_ready' : 'kickoff_pack_only';
}

/** Labeled DEMO CRM samples — industry-aware, index-stable (no shuffle). */
export function buildDemoSampleLeads(pack: VerticalDeliveryPack, count = 8) {
  const hooks = pack.outreachHooks.length ? pack.outreachHooks : [`${pack.displayName} prospect`];
  const companies = [
    `${pack.displayName.split(' ')[0]} Partners`,
    'Northline Group',
    'Summit Ventures',
    'Atlas Digital',
    'Prime Solutions',
    'Horizon Labs',
    'BluePeak Co',
    'Vertex Systems',
  ];
  const firstNames = ['Alex', 'Jordan', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'];
  const lastNames = ['Smith', 'Lee', 'Patel', 'Garcia', 'Kim', 'Brown', 'Novak', 'Silva'];
  return Array.from({ length: count }, (_, i) => ({
    firstName: firstNames[i % firstNames.length],
    lastName: lastNames[i % lastNames.length],
    email: `lead${i + 1}@example-${pack.verticalSlug.slice(0, 12)}.demo`,
    company: `[DEMO] ${companies[i % companies.length]}`,
    status: i < 3 ? ('prospect' as const) : ('lead' as const),
    source: 'fulfillment-bootstrap-demo',
    tags: [pack.verticalSlug, pack.category, 'DEMO_SAMPLE', 'industry_template'],
    notes: `[DEMO SAMPLE — ${pack.displayName} industry template] ${hooks[i % hooks.length]}`,
  }));
}

export function buildSequenceTemplates(pack: VerticalDeliveryPack): SequenceTemplate[] {
  const hooks = pack.outreachHooks.length
    ? pack.outreachHooks
    : [`${pack.displayName} intro`, `${pack.displayName} follow-up`, `${pack.displayName} breakup`];
  return [
    {
      id: 'seq_a',
      name: 'Cold intro',
      day: 0,
      subject: 'Quick idea for {{company}}',
      body: hooks[0]!,
      cta: '15-min call this week?',
    },
    {
      id: 'seq_b',
      name: 'Value follow-up',
      day: 3,
      subject: `Re: {{company}} / ${pack.displayName}`,
      body: hooks[1] ?? hooks[0]!,
      cta: 'Share one KPI you want to move.',
    },
    {
      id: 'seq_c',
      name: 'Breakup',
      day: 8,
      subject: 'Should I close the loop?',
      body: hooks[2] ?? hooks[0]!,
      cta: 'Reply "later" or book a slot.',
    },
  ];
}

export function buildWeeklyPlan(pack: VerticalDeliveryPack): WeeklyPlanWeek[] {
  return [
    {
      week: 1,
      title: 'Kickoff',
      steps: [
        'Confirm ICP + geo from vertical brief',
        'Review channel status board',
        'Personalize Seq A/B/C for top 20 accounts',
        'Log activity on kickoff support ticket',
      ],
    },
    {
      week: 2,
      title: 'Pipeline motion',
      steps: [
        'Move demo CRM rows or import real CSV',
        'Send only on CONNECTED email transport',
        'Book discovery calls into prospect stage',
      ],
    },
    {
      week: 3,
      title: 'Optimize',
      steps: [
        `Drop non-responders; refresh hooks from ${pack.displayName} pack`,
        'Update weekly snapshot on kickoff ticket',
      ],
    },
    {
      week: 4,
      title: 'Monthly report',
      steps: [
        'Count real replies/meetings only (never Titanis planning targets)',
        'List channels still NOT CONNECTED / CONFIGURATION REQUIRED',
      ],
    },
  ];
}

/** Stable structural snapshot for determinism tests (no timestamps / workspace ids). */
export function buildLeadGenOpsPackStructure(input: {
  pack: VerticalDeliveryPack;
  channelStatuses: OutreachChannelStatus[];
  liveLeadsGenerated?: number;
}) {
  const live = Math.max(0, Math.floor(Number(input.liveLeadsGenerated) || 0));
  return {
    crmStages: [...CRM_PIPELINE_STAGES],
    sequences: buildSequenceTemplates(input.pack),
    weeklyPlan: buildWeeklyPlan(input.pack),
    channelBoard: input.channelStatuses.map((c) => ({
      channel: c.channel,
      status: c.status,
      detail: c.detail,
    })),
    demoSamples: buildDemoSampleLeads(input.pack, 8),
    mode: resolveLeadGenMode({
      channelStatuses: input.channelStatuses,
      liveLeadsGenerated: live,
    }),
    liveLeadsGenerated: live,
  };
}

export function renderPipelineWorkspaceMarkdown(input: {
  clientName: string;
  pack: VerticalDeliveryPack;
  mode: LeadGenMode;
  workspaceId?: string | null;
  channelStatuses: OutreachChannelStatus[];
  leadsGenerated: number;
  /** Fixed clock for reproducible tests; defaults to now. */
  generatedAt?: string;
}): string {
  const { pack, clientName } = input;
  const sequences = buildSequenceTemplates(pack);
  const weekly = buildWeeklyPlan(pack);
  const channels = input.channelStatuses;
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  return `# Lead Gen Pipeline Workspace — ${clientName}

Vertical: ${pack.displayName}
Mode: ${input.mode}
Workspace: ${input.workspaceId ?? 'pending'}
Generated: ${generatedAt}

## CRM stages (operational)
| Stage | Purpose | Exit criteria |
|-------|---------|---------------|
| lead | New / researched contact | Email + company known |
| prospect | Engaged / replied / meeting booked | Next step dated |
| customer | Won / active account | Handoff to delivery |

Sample CRM rows are **demo seeds** (not live harvest). Replace before reporting pipeline KPIs.

## Sequence templates (copy into Outreach — not auto-sent)
### Seq A — ${sequences[0]!.name} (Day ${sequences[0]!.day})
Subject: ${sequences[0]!.subject}
Body: ${sequences[0]!.body}
CTA: ${sequences[0]!.cta}

### Seq B — ${sequences[1]!.name} (Day ${sequences[1]!.day})
Subject: ${sequences[1]!.subject}
Body: ${sequences[1]!.body}
CTA: ${sequences[1]!.cta}

### Seq C — ${sequences[2]!.name} (Day ${sequences[2]!.day})
Subject: ${sequences[2]!.subject}
Body: ${sequences[2]!.body}
CTA: ${sequences[2]!.cta}

**Honesty:** Templates are for human/ops execution. LinkedIn/Google Ads sends stay blocked while channels are NOT CONNECTED.

## Weekly plan (ops-executable)
${weekly
  .map(
    (w) =>
      `### Week ${w.week} — ${w.title}\n${w.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
  )
  .join('\n\n')}

## Channel status board
| Channel | Status | Detail |
|---------|--------|--------|
${channels.map((c) => `| ${c.channel} | **${c.status}** | ${c.detail} |`).join('\n')}

Live leads generated this kickoff: **${input.leadsGenerated}** (must stay 0 without a real harvest adapter).

## Workflow map
${pack.workflowSteps.map((s, i) => `${i + 1}. ${s.step} → \`${s.moduleSlug}\` (${s.action})`).join('\n')}
`;
}
