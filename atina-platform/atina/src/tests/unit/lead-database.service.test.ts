import { resolveLeadPhaseCapabilities, leadRolloutPhaseLabel } from '../../integrations/lead-databases/phased-rollout';
import { LeadDatabaseService } from '../../integrations/lead-database.service';

jest.mock('../../config', () => ({
  config: {
    leadDatabases: {
      enabled: true,
      rolloutPhase: 'F3',
      enrichOnHuntOverride: false,
      maxPerRun: 10,
      providerChain: ['apollo', 'hunter', 'snov'],
      emailVerifyChain: ['neverbounce', 'zerobounce'],
      apolloApiKey: '',
      hunterApiKey: 'hunter-key',
      lushaApiKey: '',
      snovApiKey: '',
      snovUserId: '',
      zoominfoApiKey: '',
      neverbounceApiKey: '',
      zerobounceApiKey: '',
    },
  },
}));

describe('lead-databases phased-rollout', () => {
  it('F3 enables enrich with hunter-first chain filter', () => {
    const caps = resolveLeadPhaseCapabilities();
    expect(caps.phase).toBe('F3');
    expect(caps.enrichOnHunt).toBe(true);
    expect(caps.verifyOnHunt).toBe(false);
    expect(caps.verifyEmailsAvailable).toBe(true);
    expect(caps.providerChain).toEqual(['hunter', 'snov']);
    expect(caps.maxPerRun).toBeLessThanOrEqual(10);
  });

  it('labels phases for admin UI', () => {
    expect(leadRolloutPhaseLabel('F0')).toContain('scrape');
    expect(leadRolloutPhaseLabel('F5')).toContain('verify');
  });
});

describe('LeadDatabaseService status', () => {
  it('reports hunter configured', () => {
    const svc = new LeadDatabaseService();
    const st = svc.getStatus();
    expect(st.providers.hunter.configured).toBe(true);
    expect(st.providers.apollo.configured).toBe(false);
    expect(st.enrichOnHunt).toBe(true);
  });
});
