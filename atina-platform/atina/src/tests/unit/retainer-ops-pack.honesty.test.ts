import { runFulfillmentQualityChecklist } from '../../modules/billing/lib/fulfillment-quality-checklist';
import { getAcceptanceContract } from '../../modules/billing/lib/deliverable-acceptance-contract';
import { getPackageDeliverySpec } from '../../modules/billing/lib/package-delivery-spec';

describe('retainer / support / lead-gen ops pack honesty', () => {
  it('acceptance contracts require anti-theater criteria', () => {
    const lead = getAcceptanceContract('lead-gen-retainer');
    expect(lead?.criteria.map((c) => c.id)).toEqual(
      expect.arrayContaining(['no_simulated_harvest', 'channel_status_honesty', 'lead_gen_kickoff', 'sla_pack']),
    );
    const ai = getAcceptanceContract('ai-support-retainer');
    expect(ai?.criteria.map((c) => c.id)).toEqual(
      expect.arrayContaining(['ai_support_setup', 'ai_avatar_honesty', 'sla_pack', 'retainer_project']),
    );
    const support = getAcceptanceContract('support-priority');
    expect(support?.criteria.map((c) => c.id)).toContain('support_faq');
  });

  it('package delivery specs describe complete ops packs (not lazy HYBRID theater)', () => {
    for (const id of [
      'support-priority',
      'support-dedicated',
      'lead-gen-retainer',
      'ai-support-retainer',
      'vertical-package',
    ]) {
      const spec = getPackageDeliverySpec(id);
      expect(spec).toBeTruthy();
      const blob = `${spec!.description} ${spec!.includes.join(' ')} ${spec!.excludes.join(' ')}`;
      expect(blob).not.toMatch(/HYBRID theater|pretend.*live/i);
      if (id === 'lead-gen-retainer') {
        expect(blob).toMatch(/CONFIGURATION REQUIRED|NOT CONNECTED/i);
        expect(blob).toMatch(/sequence|pipeline workspace|weekly plan/i);
        expect(blob).toMatch(/Invented Titanis/i);
      }
      if (id === 'ai-support-retainer') {
        expect(blob).toMatch(/CONFIGURATION REQUIRED/i);
        expect(blob).toMatch(/knowledge base|FAQ/i);
      }
    }
  });

  it('support retainers pass with FAQ + SLA + project', () => {
    for (const id of ['support-priority', 'support-dedicated'] as const) {
      const checklist = runFulfillmentQualityChecklist(id, {
        status: 'completed',
        projectId: 'proj-s',
        artifacts: [
          { type: 'pdf', filename: `${id}-welcome.pdf`, storagePath: '/p' },
          { type: 'sla_onboarding_pack', filename: `${id}-sla-onboarding.md`, storagePath: '/s' },
          { type: 'support_faq_seed', filename: 'support-faq-seed.md', storagePath: '/f' },
        ],
        metadata: {
          supportAutomation: { slaHours: id === 'support-dedicated' ? 8 : 24, modulesActivated: ['notifications'] },
          modulesActivated: ['notifications', 'support-avatar'],
        },
      });
      expect(checklist.items.find((i) => i.id === 'support_faq')?.passed).toBe(true);
      expect(checklist.items.find((i) => i.id === 'sla_pack')?.passed).toBe(true);
      expect(checklist.passed).toBe(true);
    }
  });

  it('ai-support passes with KB + CONFIGURATION REQUIRED when avatar off', () => {
    const checklist = runFulfillmentQualityChecklist('ai-support-retainer', {
      status: 'completed',
      projectId: 'proj-ai',
      artifacts: [
        { type: 'pdf', filename: 'welcome.pdf', storagePath: '/p' },
        { type: 'ai_support_setup', filename: 'ai-support-setup.json', storagePath: '/a' },
        { type: 'ai_support_knowledge_base', filename: 'ai-support-knowledge-base.md', storagePath: '/kb' },
        { type: 'support_faq_seed', filename: 'support-faq-seed.md', storagePath: '/f' },
        { type: 'sla_onboarding_pack', filename: 'ai-support-sla-onboarding.md', storagePath: '/s' },
      ],
      metadata: {
        modulesActivated: ['support-avatar', 'video-meetings', 'ai-rag'],
        aiSupportSetup: {
          ragSeeded: true,
          modulesActivated: ['support-avatar', 'ai-rag'],
          avatarConfigured: false,
          configurationRequired: ['HEYGEN_API_KEY or DID_API_KEY'],
        },
      },
    });
    expect(checklist.items.find((i) => i.id === 'ai_support_setup')?.passed).toBe(true);
    expect(checklist.items.find((i) => i.id === 'ai_avatar_honesty')?.passed).toBe(true);
    expect(checklist.passed).toBe(true);
  });
});
