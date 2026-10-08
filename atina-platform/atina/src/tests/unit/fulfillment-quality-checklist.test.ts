import { listAcceptanceContracts, allDeliverableIdsInContract } from '../../modules/billing/lib/deliverable-acceptance-contract';
import { runFulfillmentQualityChecklist } from '../../modules/billing/lib/fulfillment-quality-checklist';
import { DOC_SUBSTANCE_THRESHOLDS } from '../../modules/billing/lib/deliverable-handlers/artifact-helpers';
import { expectedBundleStepIds } from '../../modules/billing/lib/deliverable-handlers/bundle-steps';
import type { FulfillmentResult } from '../../modules/billing/lib/deliverable-handlers/types';

function passingDocQuality(deliverableId: string) {
  const threshold = DOC_SUBSTANCE_THRESHOLDS[deliverableId] ?? {
    minSections: 5,
    minTotalChars: 2000,
    minSectionChars: 140,
    minChecklistHits: 1,
    minPdfBytes: 10000,
    minPdfPages: 2,
  };
  return {
    documentSubstanceOk: true,
    documentQuality: {
      sectionCount: threshold.minSections,
      totalBodyChars: threshold.minTotalChars,
      minSectionBodyChars: threshold.minSectionChars,
      checklistOrMilestoneHits: threshold.minChecklistHits,
      clientNamePresent: true,
      industryPresent: true,
    },
    pdfBytes: threshold.minPdfBytes ?? 12000,
    pdfPageCount: threshold.minPdfPages ?? 2,
    pdfSubstanceOk: true,
  };
}

function siteMeta(extra: Record<string, unknown> = {}) {
  return {
    liveProbe: {
      ok: true,
      status: 200,
      bytes: 2400,
      detectedTitle: 'North Peak Studio',
      omniChrome: false,
      snippet: '<title>North Peak Studio</title><main>Welcome</main>',
    },
    siteTitle: 'North Peak Studio',
    brandTitle: 'North Peak Studio',
    ...extra,
  };
}

function slaArtifact(name = 'sla-onboarding-pack.pdf') {
  return {
    type: 'sla_onboarding_pack',
    filename: name,
    downloadLabel: 'SLA pack',
    storagePath: '/sla',
  };
}

function mockPassingResult(deliverableId: string): FulfillmentResult {
  const base: FulfillmentResult = {
    status: 'completed',
    artifacts: [
      { type: 'pdf', filename: 'deliverable.pdf', downloadLabel: 'PDF', storagePath: '/x' },
      { type: 'md', filename: 'deliverable.md', downloadLabel: 'Markdown', storagePath: '/m' },
    ],
    metadata: { ...passingDocQuality(deliverableId) },
  };

  const bundleSteps = expectedBundleStepIds(deliverableId);
  if (bundleSteps.length > 0) {
    const stepsMeta = {
      bundleSteps: bundleSteps.map((id) => ({ deliverableId: id, status: 'completed' as const })),
      bundleParts: bundleSteps.length,
    };
    if (deliverableId === 'bundle-portal-presence') {
      return {
        status: 'completed',
        publicUrl: '/sites/north-peak-demo',
        projectId: 'proj-setup',
        artifacts: [
          { type: 'pdf', filename: 'deliverable.pdf', downloadLabel: 'PDF', storagePath: '/x' },
          { type: 'md', filename: 'deliverable.md', downloadLabel: 'Markdown', storagePath: '/m' },
        ],
        metadata: {
          modulesActivated: ['notifications', 'billing', 'crm', 'tasks'],
          portalReady: true,
          portalEntitlements: {
            entitlementSource: 'user_modules+org',
            userModulesGranted: ['notifications', 'billing', 'crm', 'tasks'],
            billingAccess: true,
            notificationSeeded: true,
            portalReady: true,
            onboardingTasksSeeded: true,
          },
          ...stepsMeta,
          ...siteMeta(),
        },
      };
    }
    if (deliverableId === 'bundle-ops-clarity') {
      return {
        ...base,
        artifacts: [
          { type: 'audit_report', filename: 'technical-audit.pdf', downloadLabel: 'Audit', storagePath: '/a' },
          { type: 'audit_report_md', filename: 'audit_report_md.md', downloadLabel: 'Audit MD', storagePath: '/am' },
          { type: 'workflow_design', filename: 'workflow-sop-pack.pdf', downloadLabel: 'Workflow', storagePath: '/w' },
          { type: 'workflow_design_md', filename: 'workflow_design_md.md', downloadLabel: 'Workflow MD', storagePath: '/wm' },
        ],
        metadata: {
          ...passingDocQuality('bundle-ops-clarity'),
          ...stepsMeta,
        },
      };
    }
    if (deliverableId === 'bundle-sales-launch') {
      return {
        ...base,
        publicUrl: '/sites/north-peak-demo',
        projectId: 'proj-1',
        metadata: {
          ...passingDocQuality(deliverableId),
          ...stepsMeta,
          ...siteMeta(),
        },
      };
    }
  }

  if (
    deliverableId.includes('website') ||
    deliverableId === 'landing' ||
    deliverableId === 'white-label-setup'
  ) {
    const ecommerce =
      deliverableId === 'website-ecommerce'
        ? {
            ecommerceCatalog: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
            hasShopPage: true,
            catalogVisible: true,
            ecommerceScope: 'complete',
            ecommerceHonesty: true,
            ecommerceHonestyNote:
              'Complete storefront — Stripe Connect/LIVE CONFIGURATION REQUIRED (external)',
            claimsFullMerchantStore: false,
          }
        : {};
    return {
      ...base,
      publicUrl: '/sites/north-peak-demo',
      projectId: 'proj-1',
      metadata: {
        ...passingDocQuality(deliverableId),
        pageCount: 6,
        includesLanding: deliverableId === 'white-label-setup',
        ...siteMeta(ecommerce),
      },
    };
  }

  if (deliverableId.startsWith('setup-')) {
    const modules =
      deliverableId === 'setup-quick'
        ? ['notifications', 'billing', 'crm', 'tasks']
        : ['notifications', 'billing', 'crm', 'automation'];
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
        ...passingDocQuality(deliverableId),
        modulesActivated: modules,
        portalReady: true,
        portalEntitlements: {
          entitlementSource: 'user_modules+org',
          userModulesGranted: modules,
          billingAccess: true,
          notificationSeeded: true,
          portalReady: true,
          ...(deliverableId === 'setup-quick' ? { onboardingTasksSeeded: true } : {}),
        },
        crmBootstrap: { importedLeads: 8, labeledDemo: true, sampleKind: 'demo_industry_template' },
        automationHonesty: {
          automationModuleEnabled: modules.includes('automation'),
          automationConnected: false,
          status: 'MODULE_ENABLED_NOT_CONNECTED',
        },
        deployPrep: { skipped: true, sslProvisioned: false, domainConfigured: false },
        deployHonesty: {
          sslProvisioned: false,
          domainConfigured: false,
          backupLive: false,
          monitoringLive: false,
          runbookExecutable: true,
          deployPrepStatus: 'skipped',
        },
      },
    };
  }

  if (deliverableId === 'integration') {
    return {
      ...base,
      artifacts: [
        ...base.artifacts,
        { type: 'integration_config', filename: 'integration-config.json', downloadLabel: 'JSON', storagePath: '/i' },
        {
          type: 'integration_onboarding_checklist',
          filename: 'integration-onboarding-checklist.md',
          downloadLabel: 'Checklist',
          storagePath: '/ic',
        },
      ],
      metadata: {
        ...passingDocQuality(deliverableId),
        integrationConfig: {
          webhookSecret: '***redacted***',
          hasEnvMap: true,
          hasRetryPolicy: true,
          hasWebhookEndpoints: true,
          hasOnboardingChecklist: true,
        },
      },
    };
  }

  if (deliverableId === 'lead-gen-retainer') {
    return {
      ...base,
      projectId: 'proj-leadgen',
      artifacts: [
        ...base.artifacts,
        {
          type: 'lead_gen_analysis',
          filename: 'lead-gen-analysis-pack.md',
          downloadLabel: 'ICP analysis',
          storagePath: '/la',
        },
        { type: 'lead_gen_report', filename: 'lead-gen-kickoff.pdf', downloadLabel: 'Kickoff', storagePath: '/lg' },
        {
          type: 'lead_gen_pipeline_workspace',
          filename: 'lead-gen-pipeline-workspace.md',
          downloadLabel: 'Pipeline workspace',
          storagePath: '/pw',
        },
        slaArtifact('lead-gen-sla-onboarding.pdf'),
      ],
      metadata: {
        leadGenStats: {
          leadsGenerated: 0,
          sampleLeadsSeeded: 12,
          workspaceId: 'ws-1',
          mode: 'kickoff_pack_only',
          channelStatuses: [
            { channel: 'linkedin', status: 'NOT CONNECTED' },
            { channel: 'google_ads', status: 'NOT CONNECTED' },
          ],
          analysis: { rulesVersion: 'hot-v1', huntReady: false },
          hunt: { gate: { shouldHunt: false, reason: 'analysis_not_hunt_ready' }, rawFetched: 0, hotCount: 0 },
        },
        crmBootstrap: { importedLeads: 8 },
        modulesActivated: ['client-hunter', 'outreach'],
      },
    };
  }

  if (deliverableId === 'ai-support-retainer') {
    return {
      ...base,
      projectId: 'proj-ai-support',
      artifacts: [
        ...base.artifacts,
        { type: 'ai_support_setup', filename: 'ai-support-setup.json', downloadLabel: 'Setup', storagePath: '/a' },
        {
          type: 'ai_support_knowledge_base',
          filename: 'ai-support-knowledge-base.md',
          downloadLabel: 'KB',
          storagePath: '/kb',
        },
        { type: 'support_faq_seed', filename: 'support-faq-seed.md', downloadLabel: 'FAQ', storagePath: '/faq' },
        slaArtifact('ai-support-sla-onboarding.pdf'),
      ],
      metadata: {
        modulesActivated: ['support-avatar', 'video-meetings', 'ai-rag'],
        aiSupportSetup: {
          ragSeeded: true,
          modulesActivated: ['support-avatar'],
          avatarConfigured: false,
          configurationRequired: ['HEYGEN_API_KEY or DID_API_KEY for video avatar sessions'],
        },
      },
    };
  }

  if (deliverableId.startsWith('support-')) {
    return {
      ...base,
      projectId: 'proj-support',
      artifacts: [
        ...base.artifacts,
        slaArtifact(`${deliverableId}-sla-onboarding.pdf`),
        { type: 'support_faq_seed', filename: 'support-faq-seed.md', downloadLabel: 'FAQ', storagePath: '/faq' },
      ],
      metadata: {
        supportAutomation: { slaHours: deliverableId === 'support-dedicated' ? 8 : 24 },
        modulesActivated: ['notifications', 'support-avatar'],
      },
    };
  }

  if (deliverableId === 'vertical-package') {
    return {
      ...base,
      projectId: 'proj-vertical',
      artifacts: [...base.artifacts, slaArtifact('vertical-sla-onboarding.pdf')],
      metadata: {
        ...passingDocQuality(deliverableId),
        crmBootstrap: { importedLeads: 8 },
        modulesActivated: ['crm', 'automation'],
      },
    };
  }

  if (deliverableId === 'custom-software') {
    return {
      ...base,
      projectId: 'proj-sw',
      artifacts: [
        ...base.artifacts,
        {
          type: 'software_scaffold',
          filename: 'software-scaffold.tar.gz',
          storagePath: '/tmp/software-scaffold.tar.gz',
          downloadLabel: 'Runnable software scaffold (tar.gz)',
        },
      ],
      metadata: {
        ...passingDocQuality(deliverableId),
        testsPassed: true,
        buildStatus: 'completed',
        scaffoldArchive: 'software-scaffold.tar.gz',
      },
    };
  }

  if (DOC_SUBSTANCE_THRESHOLDS[deliverableId]) {
    return {
      ...base,
      metadata: { ...passingDocQuality(deliverableId) },
    };
  }

  return base;
}

describe('fulfillment quality checklist — catalog contract', () => {
  it('covers all deliverables in acceptance contract', () => {
    expect(allDeliverableIdsInContract().length).toBe(20);
    expect(listAcceptanceContracts().length).toBe(20);
  });

  for (const contract of listAcceptanceContracts()) {
    it(`passes mock fulfillment for ${contract.deliverableId}`, () => {
      const result = mockPassingResult(contract.deliverableId);
      const checklist = runFulfillmentQualityChecklist(contract.deliverableId, result);
      if (!checklist.passed) {
        const fails = checklist.items.filter((i) => !i.passed && i.id !== 'catalog_description');
        throw new Error(
          `${contract.deliverableId} failed: ${fails.map((f) => `${f.id}: ${f.message}`).join(' | ')}`,
        );
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

  it('fails white-label without publicUrl even if includesLanding flag is set', () => {
    const r = runFulfillmentQualityChecklist('white-label-setup', {
      status: 'completed',
      artifacts: [
        { type: 'pdf', filename: 'white-label-setup.pdf', storagePath: '/w' },
        { type: 'md', filename: 'white-label-setup.md', storagePath: '/wm' },
      ],
      metadata: {
        includesLanding: true,
        ...passingDocQuality('white-label-setup'),
      },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'white_label_live' && !i.passed)).toBe(true);
    expect(r.items.some((i) => i.id === 'public_url' && !i.passed)).toBe(true);
  });

  it('fails landing without public URL', () => {
    const r = runFulfillmentQualityChecklist('landing', { status: 'completed', artifacts: [], metadata: {} });
    expect(r.passed).toBe(false);
  });

  it('fails thin consulting docs without substance metrics', () => {
    const r = runFulfillmentQualityChecklist('audit', {
      status: 'completed',
      artifacts: [{ type: 'pdf', filename: 'thin.pdf', storagePath: '/t' }],
      metadata: {},
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'doc_substance' && !i.passed)).toBe(true);
  });

  it('fails audit when PDF byte/page floors are thin despite body metrics', () => {
    const threshold = DOC_SUBSTANCE_THRESHOLDS.audit;
    const r = runFulfillmentQualityChecklist('audit', {
      status: 'completed',
      artifacts: [
        { type: 'pdf', filename: 'technical-audit.pdf', storagePath: '/t' },
        { type: 'md', filename: 'audit_report_md.md', storagePath: '/m' },
      ],
      metadata: {
        documentQuality: {
          sectionCount: threshold.minSections,
          totalBodyChars: threshold.minTotalChars,
          minSectionBodyChars: threshold.minSectionChars,
          checklistOrMilestoneHits: threshold.minChecklistHits,
          clientNamePresent: true,
          industryPresent: true,
        },
        documentSubstanceOk: true,
        pdfBytes: 4096,
        pdfPageCount: 1,
      },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'doc_substance' && !i.passed)).toBe(true);
  });

  it('fails landing handoff without document substance metrics', () => {
    const r = runFulfillmentQualityChecklist('landing', {
      status: 'completed',
      publicUrl: '/sites/demo',
      artifacts: [
        { type: 'pdf', filename: 'landing-delivery.pdf', storagePath: '/x' },
        { type: 'md', filename: 'site_delivery_pack_md.md', storagePath: '/m' },
      ],
      metadata: {
        siteTitle: 'Acme Co',
        liveProbe: { ok: true, status: 200, bytes: 4000, omniChrome: false },
      },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'doc_substance' && !i.passed)).toBe(true);
  });

  it('fails published site without live HTTP probe', () => {
    const r = runFulfillmentQualityChecklist('landing', {
      status: 'completed',
      publicUrl: '/sites/demo',
      artifacts: [{ type: 'pdf', filename: 'd.pdf', storagePath: '/x' }],
      metadata: { siteTitle: 'Acme Co' },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'live_http_probe' && !i.passed)).toBe(true);
  });

  it('fails System Admin / Omni chrome site titles', () => {
    const r = runFulfillmentQualityChecklist('landing', {
      status: 'completed',
      publicUrl: '/sites/system-admin-abc',
      artifacts: [{ type: 'pdf', filename: 'd.pdf', storagePath: '/x' }],
      metadata: {
        siteTitle: 'System Admin',
        liveProbe: { ok: true, status: 200, bytes: 2000, omniChrome: false },
      },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'no_omni_chrome' && !i.passed)).toBe(true);
  });

  it('fails ecommerce that claims full merchant store with demo catalog', () => {
    const r = runFulfillmentQualityChecklist('website-ecommerce', {
      status: 'completed',
      publicUrl: '/sites/shop-demo',
      artifacts: [{ type: 'pdf', filename: 'd.pdf', storagePath: '/x' }],
      metadata: {
        siteTitle: 'Harbor Goods',
        liveProbe: { ok: true, status: 200, bytes: 3000 },
        ecommerceCatalog: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
        hasShopPage: true,
        catalogVisible: true,
        claimsFullMerchantStore: true,
      },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'ecommerce_honesty' && !i.passed)).toBe(true);
  });

  it('fails ecommerce without shop page', () => {
    const r = runFulfillmentQualityChecklist('website-ecommerce', {
      status: 'completed',
      publicUrl: '/sites/shop-demo',
      artifacts: [{ type: 'pdf', filename: 'd.pdf', storagePath: '/x' }],
      metadata: {
        siteTitle: 'Harbor Goods',
        liveProbe: { ok: true, status: 200, bytes: 3000 },
        ecommerceCatalog: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
        hasShopPage: false,
        catalogVisible: true,
        ecommerceScope: 'demo',
        claimsFullMerchantStore: false,
      },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'ecommerce_shop_page' && !i.passed)).toBe(true);
  });

  it('fails setup-quick when only portalReady is set', () => {
    const r = runFulfillmentQualityChecklist('setup-quick', {
      status: 'completed',
      projectId: 'proj-1',
      artifacts: [{ type: 'pdf', filename: 'setup.pdf', storagePath: '/x' }],
      metadata: {
        portalReady: true,
        modulesActivated: [],
        ...passingDocQuality('setup-quick'),
      },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'portal_modules' && !i.passed)).toBe(true);
  });

  it('fails setup-quick when only notifications+billing without CRM/onboarding tasks', () => {
    const r = runFulfillmentQualityChecklist('setup-quick', {
      status: 'completed',
      projectId: 'proj-1',
      artifacts: [{ type: 'pdf', filename: 'setup.pdf', storagePath: '/x' }],
      metadata: {
        ...passingDocQuality('setup-quick'),
        modulesActivated: ['notifications', 'billing'],
        portalReady: true,
        portalEntitlements: {
          entitlementSource: 'user_modules+org',
          userModulesGranted: ['notifications', 'billing'],
          billingAccess: true,
          notificationSeeded: true,
          portalReady: true,
          onboardingTasksSeeded: false,
        },
      },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'portal_modules' && !i.passed)).toBe(true);
  });

  it('passes setup-quick with CRM + onboarding tasks thickness', () => {
    const r = runFulfillmentQualityChecklist('setup-quick', {
      status: 'completed',
      projectId: 'proj-1',
      artifacts: [{ type: 'pdf', filename: 'setup.pdf', storagePath: '/x' }],
      metadata: {
        ...passingDocQuality('setup-quick'),
        modulesActivated: ['notifications', 'billing', 'crm', 'tasks'],
        portalReady: true,
        portalEntitlements: {
          entitlementSource: 'user_modules+org',
          userModulesGranted: ['notifications', 'billing', 'crm', 'tasks'],
          billingAccess: true,
          notificationSeeded: true,
          portalReady: true,
          onboardingTasksSeeded: true,
        },
      },
    });
    expect(r.items.find((i) => i.id === 'portal_modules')?.passed).toBe(true);
  });

  it('fails setup-custom when skipped deploy claims SSL done', () => {
    const r = runFulfillmentQualityChecklist('setup-custom', {
      status: 'completed',
      projectId: 'proj-1',
      artifacts: [
        { type: 'pdf', filename: 'setup.pdf', storagePath: '/x' },
        {
          type: 'production_deploy_manifest',
          filename: 'production-deploy-manifest.json',
          storagePath: '/p',
        },
      ],
      metadata: {
        ...passingDocQuality('setup-custom'),
        modulesActivated: ['crm', 'notifications', 'billing'],
        crmBootstrap: { importedLeads: 8, labeledDemo: true },
        deployPrep: { skipped: true },
        deployHonesty: {
          sslProvisioned: true,
          domainConfigured: true,
          runbookExecutable: true,
        },
      },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'production_manifest' && !i.passed)).toBe(true);
  });
});
