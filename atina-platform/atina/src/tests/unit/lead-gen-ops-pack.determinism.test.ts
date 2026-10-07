import { resolveVerticalDeliveryPack } from '../../modules/autonomy-loop/lib/vertical-delivery-resolver';
import {
  CRM_PIPELINE_STAGES,
  buildDemoSampleLeads,
  buildLeadGenOpsPackStructure,
  buildSequenceTemplates,
  buildWeeklyPlan,
  renderPipelineWorkspaceMarkdown,
  resolveLeadGenMode,
  type OutreachChannelStatus,
} from '../../modules/billing/lib/lead-gen-ops-pack';

function packFor(slug: string, category: string, name: string) {
  return resolveVerticalDeliveryPack({ slug, category, subtype: null, name });
}

const disconnected: OutreachChannelStatus[] = [
  { channel: 'linkedin', status: 'NOT CONNECTED', detail: 'missing' },
  { channel: 'google_ads', status: 'NOT CONNECTED', detail: 'missing' },
  { channel: 'meta_ads', status: 'NOT CONNECTED', detail: 'missing' },
  { channel: 'apollo', status: 'NOT CONNECTED', detail: 'missing' },
  { channel: 'email', status: 'NOT CONNECTED', detail: 'missing' },
];

describe('lead-gen ops pack determinism', () => {
  it('same industry input → identical ops pack structure (CRM, sequences, weekly, channel board)', () => {
    const packA = packFor('construction', 'construction', 'Construction');
    const packB = packFor('construction', 'construction', 'Construction');
    const a = buildLeadGenOpsPackStructure({
      pack: packA,
      channelStatuses: disconnected,
      liveLeadsGenerated: 0,
    });
    const b = buildLeadGenOpsPackStructure({
      pack: packB,
      channelStatuses: disconnected,
      liveLeadsGenerated: 0,
    });
    expect(a).toEqual(b);
    expect(a.crmStages).toEqual([...CRM_PIPELINE_STAGES]);
    expect(a.sequences).toHaveLength(3);
    expect(a.weeklyPlan).toHaveLength(4);
    expect(a.demoSamples).toHaveLength(8);
    expect(a.mode).toBe('kickoff_pack_only');
    expect(a.liveLeadsGenerated).toBe(0);
  });

  it('leads_generated stays 0 without live source; mode is rule-based', () => {
    expect(
      resolveLeadGenMode({ channelStatuses: disconnected, liveLeadsGenerated: 0 }),
    ).toBe('kickoff_pack_only');
    expect(
      resolveLeadGenMode({
        channelStatuses: [
          ...disconnected.filter((c) => c.channel !== 'apollo'),
          { channel: 'apollo', status: 'CONNECTED', detail: 'APOLLO_API_KEY configured' },
        ],
        liveLeadsGenerated: 0,
      }),
    ).toBe('channels_ready');
    expect(
      resolveLeadGenMode({
        channelStatuses: [
          ...disconnected.filter((c) => c.channel !== 'apollo'),
          { channel: 'apollo', status: 'CONNECTED', detail: 'APOLLO_API_KEY configured' },
        ],
        liveLeadsGenerated: 12,
      }),
    ).toBe('live_harvest');
    // Fake contacts without CONNECTED enrichment cannot claim live_harvest
    expect(
      resolveLeadGenMode({ channelStatuses: disconnected, liveLeadsGenerated: 99 }),
    ).toBe('kickoff_pack_only');
  });

  it('demo samples are industry-aware and index-stable (no shuffle)', () => {
    const finance = packFor('finance', 'finance', 'Finance');
    const healthcare = packFor('healthcare', 'healthcare', 'Healthcare');
    const a1 = buildDemoSampleLeads(finance, 8);
    const a2 = buildDemoSampleLeads(finance, 8);
    const b = buildDemoSampleLeads(healthcare, 8);
    expect(a1).toEqual(a2);
    expect(a1[0]!.email).toBe(a2[0]!.email);
    expect(a1[0]!.company).not.toBe(b[0]!.company);
    expect(a1.every((s) => s.tags.includes('DEMO_SAMPLE'))).toBe(true);
    expect(a1.every((s) => s.company.startsWith('[DEMO]'))).toBe(true);
  });

  it('pipeline workspace markdown is reproducible with fixed generatedAt', () => {
    const pack = packFor('marketing', 'marketing', 'Marketing');
    const sequences = buildSequenceTemplates(pack);
    const weekly = buildWeeklyPlan(pack);
    const md1 = renderPipelineWorkspaceMarkdown({
      clientName: 'Acme Co',
      pack,
      mode: 'kickoff_pack_only',
      workspaceId: 'ws-fixed',
      channelStatuses: disconnected,
      leadsGenerated: 0,
      generatedAt: '2026-10-07T00:00:00.000Z',
    });
    const md2 = renderPipelineWorkspaceMarkdown({
      clientName: 'Acme Co',
      pack,
      mode: 'kickoff_pack_only',
      workspaceId: 'ws-fixed',
      channelStatuses: disconnected,
      leadsGenerated: 0,
      generatedAt: '2026-10-07T00:00:00.000Z',
    });
    expect(md1).toBe(md2);
    expect(md1).toContain('## CRM stages (operational)');
    expect(md1).toContain(sequences[0]!.body);
    expect(md1).toContain(`Week 1 — ${weekly[0]!.title}`);
    expect(md1).toMatch(/\| linkedin \| \*\*NOT CONNECTED\*\*/);
    expect(md1).toContain('Live leads generated this kickoff: **0**');
  });

  it('different industries produce different sequence hooks (still deterministic each)', () => {
    const legal = packFor('legal', 'legal', 'Legal');
    const edu = packFor('education', 'education', 'Education');
    const s1 = buildSequenceTemplates(legal);
    const s2 = buildSequenceTemplates(legal);
    const sEdu = buildSequenceTemplates(edu);
    expect(s1).toEqual(s2);
    expect(JSON.stringify(s1)).not.toEqual(JSON.stringify(sEdu));
  });
});
