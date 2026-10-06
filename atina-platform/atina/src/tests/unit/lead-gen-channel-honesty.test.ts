import {
  resolveLeadGenChannelStatuses,
} from '../../modules/billing/service/client-deliverable-bootstrap.service';
import { runFulfillmentQualityChecklist } from '../../modules/billing/lib/fulfillment-quality-checklist';

describe('lead-gen channel honesty', () => {
  const keys = [
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
    'GOOGLE_ADS_CUSTOMER_ID',
    'MARKETING_ADS_LIVE_SYNC',
    'APOLLO_API_KEY',
    'LINKEDIN_ACCESS_TOKEN',
    'META_ADS_ACCESS_TOKEN',
    'META_ADS_AD_ACCOUNT_ID',
    'RESEND_API_KEY',
    'SMTP_USER',
    'SMTP_PASSWORD',
  ];
  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of keys) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of keys) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it('marks LinkedIn and Google Ads NOT CONNECTED without credentials', () => {
    const statuses = resolveLeadGenChannelStatuses();
    expect(statuses.find((c) => c.channel === 'linkedin')?.status).toBe('NOT CONNECTED');
    expect(statuses.find((c) => c.channel === 'google_ads')?.status).toBe('NOT CONNECTED');
    expect(statuses.find((c) => c.channel === 'apollo')?.status).toBe('NOT CONNECTED');
  });

  it('marks Google Ads CONNECTED only with full creds + live sync', () => {
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN = 'tok';
    process.env.GOOGLE_ADS_CLIENT_ID = 'id';
    process.env.GOOGLE_ADS_CLIENT_SECRET = 'sec';
    process.env.GOOGLE_ADS_REFRESH_TOKEN = 'ref';
    process.env.GOOGLE_ADS_CUSTOMER_ID = '123';
    process.env.MARKETING_ADS_LIVE_SYNC = 'true';
    const statuses = resolveLeadGenChannelStatuses();
    expect(statuses.find((c) => c.channel === 'google_ads')?.status).toBe('CONNECTED');
    expect(statuses.find((c) => c.channel === 'linkedin')?.status).toBe('NOT CONNECTED');
  });

  it('quality checklist accepts kickoff pack with 0 live leads when channels NOT CONNECTED', () => {
    const checklist = runFulfillmentQualityChecklist('lead-gen-retainer', {
      status: 'completed',
      projectId: 'proj-1',
      artifacts: [
        { type: 'pdf', filename: 'welcome.pdf', storagePath: '/p' },
        { type: 'lead_gen_report', filename: 'lead-gen-kickoff-report.md', storagePath: '/r' },
        { type: 'sla_onboarding_pack', filename: 'lead-gen-retainer-sla-onboarding.md', storagePath: '/s' },
      ],
      metadata: {
        modulesActivated: ['outreach'],
        crmBootstrap: { importedLeads: 8 },
        leadGenStats: {
          leadsGenerated: 0,
          sampleLeadsSeeded: 8,
          workspaceId: 'ws',
          mode: 'kickoff_pack_only',
          channelStatuses: resolveLeadGenChannelStatuses(),
        },
      },
    });
    expect(checklist.items.find((i) => i.id === 'lead_gen_kickoff')?.passed).toBe(true);
    expect(checklist.items.find((i) => i.id === 'channel_status_honesty')?.passed).toBe(true);
    expect(checklist.items.find((i) => i.id === 'retainer_project')?.passed).toBe(true);
    expect(checklist.items.find((i) => i.id === 'sla_pack')?.passed).toBe(true);
  });

  it('quality checklist fails lead-gen when channel statuses are missing', () => {
    const checklist = runFulfillmentQualityChecklist('lead-gen-retainer', {
      status: 'completed',
      projectId: 'proj-1',
      artifacts: [
        { type: 'pdf', filename: 'welcome.pdf', storagePath: '/p' },
        { type: 'lead_gen_report', filename: 'lead-gen-kickoff-report.md', storagePath: '/r' },
        { type: 'sla_onboarding_pack', filename: 'lead-gen-retainer-sla-onboarding.md', storagePath: '/s' },
      ],
      metadata: {
        modulesActivated: ['outreach'],
        crmBootstrap: { importedLeads: 8 },
        leadGenStats: {
          leadsGenerated: 25,
          sampleLeadsSeeded: 0,
          workspaceId: 'ws',
          mode: 'live_kickoff',
        },
      },
    });
    expect(checklist.items.find((i) => i.id === 'channel_status_honesty')?.passed).toBe(false);
  });
});
