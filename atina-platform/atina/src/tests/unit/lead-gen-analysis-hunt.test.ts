import { resolveVerticalDeliveryPack } from '../../modules/autonomy-loop/lib/vertical-delivery-resolver';
import type { LeadRecord } from '../../integrations/lead-databases/types';
import {
  buildLeadGenAnalysisPack,
  filterHotLeads,
  planLiveHuntFromAnalysis,
  resolveLiveHuntGate,
  scoreHotLead,
} from '../../modules/billing/lib/lead-gen-analysis-hunt';
import type { OutreachChannelStatus } from '../../modules/billing/lib/lead-gen-ops-pack';

type Channel = OutreachChannelStatus;

function packConstruction() {
  return resolveVerticalDeliveryPack({
    slug: 'construction',
    category: 'construction',
    subtype: null,
    name: 'Construction',
  });
}

const disconnected: Channel[] = [
  { channel: 'linkedin', status: 'NOT CONNECTED', detail: 'missing' },
  { channel: 'google_ads', status: 'NOT CONNECTED', detail: 'missing' },
  { channel: 'meta_ads', status: 'NOT CONNECTED', detail: 'missing' },
  { channel: 'apollo', status: 'NOT CONNECTED', detail: 'missing' },
  { channel: 'email', status: 'NOT CONNECTED', detail: 'missing' },
];

const apolloConnected: Channel[] = [
  ...disconnected.filter((c) => c.channel !== 'apollo'),
  { channel: 'apollo', status: 'CONNECTED', detail: 'APOLLO_API_KEY configured' },
];

function lead(partial: Partial<LeadRecord> & Pick<LeadRecord, 'email' | 'title'>): LeadRecord {
  return {
    firstName: partial.firstName ?? 'Pat',
    lastName: partial.lastName ?? 'Lee',
    company: partial.company ?? 'Northline Construction',
    companyDomain: partial.companyDomain ?? 'northline-construction.example',
    phone: null,
    linkedinUrl: null,
    provider: partial.provider ?? 'apollo',
    verified: partial.verified ?? false,
    email: partial.email,
    title: partial.title,
    raw: partial.raw,
  };
}

describe('lead-gen analysis → hot hunt', () => {
  it('Phase A analysis always builds ICP + thresholds (deterministic)', () => {
    const pack = packConstruction();
    const a = buildLeadGenAnalysisPack({ pack, channelStatuses: disconnected });
    const b = buildLeadGenAnalysisPack({ pack, channelStatuses: disconnected });
    expect(a).toEqual(b);
    expect(a.rulesVersion).toBe('hot-v1');
    expect(a.icp.keywords.length).toBeGreaterThan(0);
    expect(a.thresholds.minIcpScore).toBe(60);
    expect(a.huntReady).toBe(false);
    expect(a.huntBlockedReason).toMatch(/enrichment/i);
  });

  it('no hunt without analysis huntReady (even if live flag + enrichment on)', () => {
    const analysis = buildLeadGenAnalysisPack({
      pack: packConstruction(),
      channelStatuses: disconnected,
    });
    expect(analysis.huntReady).toBe(false);
    const gate = resolveLiveHuntGate({
      analysis,
      liveHarvestEnabled: true,
      enrichmentActive: true,
    });
    expect(gate.shouldHunt).toBe(false);

    const outcome = planLiveHuntFromAnalysis({
      analysis,
      liveHarvestEnabled: true,
      enrichmentActive: true,
      rawContacts: [
        lead({ email: 'ceo@builders.com', title: 'CEO', company: 'Builders Construction' }),
      ],
    });
    expect(outcome.gate.shouldHunt).toBe(false);
    expect(outcome.leadsGenerated).toBe(0);
    expect(outcome.rawFetched).toBe(0);
    expect(outcome.filter).toBeNull();
  });

  it('without enrichment keys / inactive enrichment → leads=0 even when analysis huntReady', () => {
    const analysis = buildLeadGenAnalysisPack({
      pack: packConstruction(),
      channelStatuses: apolloConnected,
    });
    expect(analysis.huntReady).toBe(true);

    const noFlag = planLiveHuntFromAnalysis({
      analysis,
      liveHarvestEnabled: false,
      enrichmentActive: true,
      rawContacts: [lead({ email: 'ceo@x.com', title: 'CEO', company: 'Construction Co' })],
    });
    expect(noFlag.gate.shouldHunt).toBe(false);
    expect(noFlag.leadsGenerated).toBe(0);

    const noKeys = planLiveHuntFromAnalysis({
      analysis,
      liveHarvestEnabled: true,
      enrichmentActive: false,
      rawContacts: [lead({ email: 'ceo@x.com', title: 'CEO', company: 'Construction Co' })],
    });
    expect(noKeys.gate.shouldHunt).toBe(false);
    expect(noKeys.leadsGenerated).toBe(0);
    expect(noKeys.gate.reason).toMatch(/Enrichment inactive/i);
  });

  it('mixed-quality enrichment → only hot leads pass Phase C', () => {
    const analysis = buildLeadGenAnalysisPack({
      pack: packConstruction(),
      channelStatuses: apolloConnected,
    });

    const mixed: LeadRecord[] = [
      lead({
        email: 'ceo@summit-construction.com',
        title: 'CEO',
        company: 'Summit Construction',
        verified: true,
      }),
      lead({
        email: 'intern@summit-construction.com',
        title: 'Intern',
        company: 'Summit Construction',
      }),
      lead({
        email: 'helper@randomcorp.io',
        title: 'Junior Coordinator',
        company: 'Random Corp',
      }),
      lead({
        email: 'noreply@example.com',
        title: 'Director of Operations',
        company: 'Example Construction',
      }),
      lead({
        email: 'vp@northline-builders.com',
        title: 'VP Sales',
        company: 'Northline Builders',
      }),
      {
        ...lead({ email: null as unknown as string, title: 'Founder', company: 'Build Co' }),
        email: null,
      },
    ];

    const filtered = filterHotLeads(mixed, analysis, { huntedWithIcpKeywords: true });
    expect(filtered.rawCount).toBe(6);
    expect(filtered.hotCount).toBeGreaterThanOrEqual(1);
    expect(filtered.hotCount).toBeLessThan(mixed.length);
    expect(filtered.hot.every((h) => h.email)).toBe(true);
    expect(filtered.hot.some((h) => /intern/i.test(h.title ?? ''))).toBe(false);
    expect(filtered.hot.some((h) => /junior/i.test(h.title ?? ''))).toBe(false);
    expect(filtered.rejected.some((r) => r.reasons.includes('excluded_generic_role'))).toBe(true);
    expect(filtered.rejected.some((r) => r.reasons.includes('no_email') || r.reasons.includes('junk_email'))).toBe(
      true,
    );

    const outcome = planLiveHuntFromAnalysis({
      analysis,
      liveHarvestEnabled: true,
      enrichmentActive: true,
      rawContacts: mixed,
    });
    expect(outcome.gate.shouldHunt).toBe(true);
    expect(outcome.leadsGenerated).toBe(filtered.hotCount);
    expect(outcome.leadsGenerated).not.toBe(mixed.length);
  });

  it('scoreHotLead rejects missing title and non-decision-makers', () => {
    const analysis = buildLeadGenAnalysisPack({
      pack: packConstruction(),
      channelStatuses: apolloConnected,
    });
    expect(
      scoreHotLead(lead({ email: 'a@co.com', title: '', company: 'Construction LLC' }), analysis).hot,
    ).toBe(false);
    expect(
      scoreHotLead(
        lead({ email: 'a@co.com', title: 'Software Engineer', company: 'Construction LLC' }),
        analysis,
      ).reasons,
    ).toContain('title_not_decision_maker');
    expect(
      scoreHotLead(
        lead({ email: 'owner@co.com', title: 'Owner', company: 'Construction LLC', verified: true }),
        analysis,
      ).hot,
    ).toBe(true);
  });

  it('hunt with empty raw enrichment → honest 0 hot (no invented leads)', () => {
    const analysis = buildLeadGenAnalysisPack({
      pack: packConstruction(),
      channelStatuses: apolloConnected,
    });
    const outcome = planLiveHuntFromAnalysis({
      analysis,
      liveHarvestEnabled: true,
      enrichmentActive: true,
      rawContacts: [],
    });
    expect(outcome.gate.shouldHunt).toBe(true);
    expect(outcome.leadsGenerated).toBe(0);
    expect(outcome.hotCount).toBe(0);
  });
});
