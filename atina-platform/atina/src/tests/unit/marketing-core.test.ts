import {
  computeCac,
  computeCpl,
  computeCpql,
  computeChannelEconomics,
  computeContribution,
  computeRoi,
  computeRoas,
  marketingContribution,
} from '../../modules/marketing/lib/economics';
import { attributeTouchpoints } from '../../modules/marketing/lib/attribution';
import { scoreLeadQuality } from '../../modules/marketing/lib/lead-quality';
import { reconcileMarketing } from '../../modules/marketing/lib/reconcile';
import { recommendNextEur } from '../../modules/marketing/lib/budget-optimizer';
import { runWhatIf } from '../../modules/marketing/lib/scenario';
import { computeMarketingHealth } from '../../modules/marketing/lib/health';
import { GoogleAdsAdapter, ManualCsvAdapter, MetaAdsAdapter } from '../../modules/marketing/lib/adapters';
import { MARKETING_ENGINE_VERSION, CHANNEL_CODES } from '../../modules/marketing/lib/constants';
import { inferChannelFromAttribution } from '../../modules/marketing/lib/channel-infer';

describe('marketing core', () => {
  it('exports version and channel codes', () => {
    expect(MARKETING_ENGINE_VERSION).toBe('1.0.0');
    expect(CHANNEL_CODES).toContain('google_ads');
    expect(CHANNEL_CODES).toContain('outbound');
  });

  it('computes CPL/CPQL/CAC and returns null on divide-by-zero', () => {
    expect(computeCpl(100, 10)).toBe(10);
    expect(computeCpql(100, 0)).toBeNull();
    expect(computeCac(200, 4)).toBe(50);
  });

  it('prefers contribution economics over lead volume vanity', () => {
    const cheapLeads = computeChannelEconomics({
      spend: 200,
      leads: 100,
      qualifiedLeads: 0,
      opportunities: 0,
      offers: 0,
      customers: 0,
      revenue: 0,
    });
    const costlyWinners = computeChannelEconomics({
      spend: 300,
      leads: 20,
      qualifiedLeads: 10,
      opportunities: 6,
      offers: 5,
      customers: 4,
      revenue: 20000,
      paymentFees: 580,
      deliveryCosts: 2000,
    });
    expect(cheapLeads.cpl).toBe(2);
    expect(cheapLeads.leadToCustomer).toBe(0);
    expect(cheapLeads.cac).toBeNull();
    expect(costlyWinners.contribution).toBeGreaterThan(cheapLeads.contribution);
    expect(costlyWinners.marketingContribution).toBeGreaterThan(0);
    expect(computeRoi(costlyWinners.contribution, 300)).not.toBeNull();
    expect(computeRoas(20000, 300)).toBeCloseTo(20000 / 300);
    expect(marketingContribution(computeContribution({ revenue: 100, paymentFees: 10 }), 20)).toBe(70);
  });

  it('labels empty attribution as ATTRIBUTION_UNCERTAIN', () => {
    const empty = attributeTouchpoints([], 'last_touch');
    expect(empty.label).toBe('ATTRIBUTION_UNCERTAIN');
    expect(empty.labeledUncertain).toBe(true);
  });

  it('attributes first/last/linear touchpoints', () => {
    const tps = [
      { channelCode: 'seo', occurredAt: '2026-01-01T00:00:00Z' },
      { channelCode: 'google_ads', occurredAt: '2026-01-05T00:00:00Z' },
    ];
    expect(attributeTouchpoints(tps, 'first_touch').shares[0].channelCode).toBe('seo');
    expect(attributeTouchpoints(tps, 'last_touch').shares[0].channelCode).toBe('google_ads');
    const linear = attributeTouchpoints(tps, 'linear');
    expect(linear.shares).toHaveLength(2);
    expect(linear.shares[0].weight).toBeCloseTo(0.5);
  });

  it('scores lead quality deterministically with explainable breakdown', () => {
    const r = scoreLeadQuality({
      industryRelevance: 1,
      budgetPotential: 1,
      purchaseIntent: 0.5,
    });
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.breakdown.some((b) => b.signal === 'budgetPotential' && b.value === 1)).toBe(true);
    expect(r.kind).toBe('ACTUAL');
  });

  it('reconciles platform vs Omni discrepancies', () => {
    const r = reconcileMarketing(
      { conversions: 10, conversionValue: 5000, spend: 400 },
      { leads: 6, qualifiedLeads: 2, customers: 1, revenueCollected: 2990 }
    );
    expect(r.hasDiscrepancy).toBe(true);
    expect(r.rows.some((row) => row.status === 'DISCREPANCY')).toBe(true);
  });

  it('never allocates 100% of next €100 to a single channel', () => {
    const plan = recommendNextEur(
      [
        { channelCode: 'google_ads', spend: 500, customers: 5, contribution: 2000, cac: 100, confidence: 'high' },
        { channelCode: 'meta_ads', spend: 200, customers: 1, contribution: 100, cac: 200, confidence: 'low' },
      ],
      100
    );
    expect(plan.kind).toBe('RECOMMENDATION');
    expect(plan.allocations.length).toBeGreaterThanOrEqual(1);
    expect(plan.reserveEur).toBeGreaterThan(0);
    const maxShare = Math.max(...plan.allocations.map((a) => a.amountEur));
    expect(maxShare).toBeLessThan(100);
  });

  it('labels what-if as FORECAST / SCENARIO', () => {
    const s = runWhatIf({
      spend: 100,
      leads: 10,
      qualifiedLeads: 4,
      opportunities: 2,
      offers: 2,
      customers: 1,
      revenue: 1000,
      spendMultiplier: 2,
    });
    expect(s.kind).toBe('SCENARIO');
    expect(s.label).toBe('FORECAST / SCENARIO');
    expect(s.deltas.spend).toBe(100);
  });

  it('computes multi-dimension marketing health', () => {
    const h = computeMarketingHealth({
      hasTracking: false,
      touchpointCount: 0,
      spendEntries: 0,
      channelCount: 8,
      openAlerts: 0,
      hasDiscrepancy: false,
      budgetConfigured: false,
      experimentCount: 0,
      leads: 0,
      customers: 0,
    });
    expect(h.dimensions.length).toBeGreaterThanOrEqual(8);
    expect(h.kind).toBe('ACTUAL');
  });

  it('CSV adapter parses rows; Google/Meta stubs are UNAVAILABLE without credentials', async () => {
    const csv = await new ManualCsvAdapter('channel,amount,date\ngoogle_ads,50,2026-09-01\n').sync();
    expect(csv.status).toBe('success');
    expect(csv.rows?.[0].amountCents).toBe(5000);

    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    delete process.env.GOOGLE_ADS_CLIENT_ID;
    delete process.env.META_ADS_ACCESS_TOKEN;
    delete process.env.MARKETING_ADS_LIVE_SYNC;
    const g = await new GoogleAdsAdapter().sync();
    const m = await new MetaAdsAdapter().sync();
    expect(g.kind).toBe('UNAVAILABLE');
    expect(m.kind).toBe('UNAVAILABLE');
  });

  it('Google/Meta report credentials-present gate when LIVE sync flag off', async () => {
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'tok';
    process.env.GOOGLE_ADS_CLIENT_ID = 'cid';
    process.env.GOOGLE_ADS_CLIENT_SECRET = 'sec';
    process.env.GOOGLE_ADS_REFRESH_TOKEN = 'rt';
    process.env.GOOGLE_ADS_CUSTOMER_ID = '123';
    process.env.META_ADS_ACCESS_TOKEN = 'mt';
    process.env.META_ADS_AD_ACCOUNT_ID = 'act_1';
    delete process.env.MARKETING_ADS_LIVE_SYNC;
    const g = await new GoogleAdsAdapter().sync();
    const m = await new MetaAdsAdapter().sync();
    expect(g.status).toBe('unavailable');
    expect(g.message).toMatch(/MARKETING_ADS_LIVE_SYNC/);
    expect(m.message).toMatch(/MARKETING_ADS_LIVE_SYNC/);
    delete process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    delete process.env.GOOGLE_ADS_CLIENT_ID;
    delete process.env.GOOGLE_ADS_CLIENT_SECRET;
    delete process.env.GOOGLE_ADS_REFRESH_TOKEN;
    delete process.env.GOOGLE_ADS_CUSTOMER_ID;
    delete process.env.META_ADS_ACCESS_TOKEN;
    delete process.env.META_ADS_AD_ACCOUNT_ID;
  });

  it('parses Resend open/click webhook payloads', async () => {
    const { parseResendWebhookPayload, mapResendEventType } = await import(
      '../../modules/marketing/lib/email-engagement'
    );
    expect(mapResendEventType('email.opened')).toBe('opened');
    const opened = parseResendWebhookPayload({
      type: 'email.opened',
      id: 'evt_1',
      created_at: '2026-09-30T12:00:00Z',
      data: { email_id: 'msg_1', to: ['lead@example.com'] },
    });
    expect(opened?.eventType).toBe('opened');
    expect(opened?.email).toBe('lead@example.com');
    expect(parseResendWebhookPayload({ type: 'unknown' })).toBeNull();
  });

  it('package×channel matrix is UNAVAILABLE without rows', async () => {
    jest.resetModules();
    jest.doMock('../../database/connection', () => ({
      query: jest.fn().mockRejectedValue(new Error('no_db')),
    }));
    const { buildPackageChannelMatrix } = await import(
      '../../modules/marketing/lib/package-channel-matrix'
    );
    const m = await buildPackageChannelMatrix();
    expect(m.kind).toBe('UNAVAILABLE');
    expect(m.rows).toEqual([]);
  });

  it('infers channel from UTM without inventing paid spend', () => {
    expect(inferChannelFromAttribution({ utm_source: 'google', utm_medium: 'cpc' })).toBe('google_ads');
    expect(inferChannelFromAttribution({ utm_source: 'newsletter', utm_medium: 'email' })).toBe('email');
    expect(inferChannelFromAttribution({})).toBeNull();
  });

  it('OMI marketing answers label UNAVAILABLE when spend missing', async () => {
    jest.resetModules();
    jest.doMock('../../modules/marketing/service/marketing.service', () => ({
      MarketingService: jest.fn().mockImplementation(() => ({
        getOverview: jest.fn().mockResolvedValue({
          kind: 'ACTUAL',
          totals: { spendEur: 0, leads: 0, customers: 0, cac: null },
          channels: [{ code: 'google_ads', spendEur: undefined }],
          topChannelCode: null,
        }),
        getEconomics: jest.fn().mockResolvedValue({ nextEur100: { allocations: [] } }),
        runWhatIf: jest.fn(),
      })),
    }));
    const { answerMarketingAdminQuestion: ask } = await import(
      '../../modules/marketing/lib/omi-marketing'
    );
    const a = await ask('Koliko nas je Google koštao ovog meseca?');
    expect(a.kind).toBe('UNAVAILABLE');
    expect(a.answer).toMatch(/N\/A|UNAVAILABLE|no ACTUAL/i);
  });
});
