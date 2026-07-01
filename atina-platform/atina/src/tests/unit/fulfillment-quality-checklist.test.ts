import { listAcceptanceContracts, allDeliverableIdsInContract } from '../../modules/billing/lib/deliverable-acceptance-contract';
import { runFulfillmentQualityChecklist } from '../../modules/billing/lib/fulfillment-quality-checklist';
import type { FulfillmentResult } from '../../modules/billing/lib/deliverable-handlers/types';

function mockPassingResult(deliverableId: string): FulfillmentResult {
  const base: FulfillmentResult = {
    status: 'completed',
    artifacts: [{ type: 'pdf', filename: 'deliverable.pdf', downloadLabel: 'PDF', storagePath: '/x' }],
    metadata: {},
  };

  if (deliverableId.includes('website') || deliverableId === 'landing' || deliverableId === 'white-label-setup') {
    return {
      ...base,
      publicUrl: '/sites/demo',
      projectId: 'proj-1',
      metadata: {
        pageCount: 6,
        ecommerceCatalog: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
        includesLanding: deliverableId === 'white-label-setup',
      },
    };
  }

  if (deliverableId.startsWith('setup-')) {
    return {
      ...base,
      projectId: 'proj-setup',
      artifacts: [
        ...base.artifacts,
        { type: 'migration_template', filename: 'crm-migration-template.csv', downloadLabel: 'CSV', storagePath: '/m' },
        { type: 'training_outline', filename: 'training-outline.md', downloadLabel: 'Training', storagePath: '/t' },
        {
          type: 'production_deploy_manifest',
          filename: 'production-deploy-manifest.json',
          downloadLabel: 'Manifest',
          storagePath: '/p',
        },
      ],
      metadata: {
        modulesActivated: ['notifications', 'billing', 'crm'],
        portalReady: true,
        crmBootstrap: { importedLeads: 8 },
      },
    };
  }

  if (deliverableId === 'integration') {
    return {
      ...base,
      artifacts: [
        ...base.artifacts,
        { type: 'integration_config', filename: 'integration-config.json', downloadLabel: 'JSON', storagePath: '/i' },
      ],
    };
  }

  if (deliverableId === 'lead-gen-retainer') {
    return {
      ...base,
      metadata: {
        leadGenStats: { leadsGenerated: 25 },
        crmBootstrap: { importedLeads: 8 },
        modulesActivated: ['client-hunter', 'outreach'],
      },
    };
  }

  if (deliverableId === 'ai-support-retainer') {
    return {
      ...base,
      artifacts: [
        ...base.artifacts,
        { type: 'ai_support_setup', filename: 'ai-support-setup.json', downloadLabel: 'Setup', storagePath: '/a' },
      ],
      metadata: {
        modulesActivated: ['support-avatar', 'video-meetings', 'ai-rag'],
        aiSupportSetup: { ragSeeded: true, modulesActivated: ['support-avatar'] },
      },
    };
  }

  if (deliverableId.startsWith('support-')) {
    return {
      ...base,
      metadata: {
        supportAutomation: { slaHours: deliverableId === 'support-dedicated' ? 8 : 24 },
        modulesActivated: ['notifications', 'support-avatar'],
      },
    };
  }

  if (deliverableId === 'vertical-package') {
    return {
      ...base,
      metadata: {
        crmBootstrap: { importedLeads: 8 },
        modulesActivated: ['crm', 'automation'],
      },
    };
  }

  if (deliverableId === 'custom-software') {
    return {
      ...base,
      projectId: 'proj-sw',
      metadata: { testsPassed: true, buildStatus: 'completed' },
    };
  }

  return base;
}

describe('fulfillment quality checklist — 17 package contract', () => {
  it('covers all 17 deliverables in acceptance contract', () => {
    expect(allDeliverableIdsInContract().length).toBe(17);
    expect(listAcceptanceContracts().length).toBe(17);
  });

  for (const contract of listAcceptanceContracts()) {
    it(`passes mock fulfillment for ${contract.deliverableId}`, () => {
      const result = mockPassingResult(contract.deliverableId);
      const checklist = runFulfillmentQualityChecklist(contract.deliverableId, result);
      if (!checklist.passed) {
        const fails = checklist.items.filter((i) => !i.passed && i.id !== 'catalog_description');
        throw new Error(`${contract.deliverableId} failed: ${fails.map((f) => f.id).join(', ')}`);
      }
      expect(checklist.passed).toBe(true);
      expect(checklist.score).toBeGreaterThanOrEqual(80);
    });
  }
});

describe('fulfillment quality checklist — failures block release', () => {
  it('fails when status is not completed', () => {
    const r = runFulfillmentQualityChecklist('audit', {
      status: 'partial',
      artifacts: [],
      metadata: {},
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'status_completed' && !i.passed)).toBe(true);
  });

  it('fails landing without public URL', () => {
    const r = runFulfillmentQualityChecklist('landing', { status: 'completed', artifacts: [], metadata: {} });
    expect(r.passed).toBe(false);
  });
});
