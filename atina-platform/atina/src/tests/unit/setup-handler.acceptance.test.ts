const runAutomatedClientOrder = jest.fn();
const bootstrapQuickPortal = jest.fn();
const seedCrmPipeline = jest.fn();
const activateModules = jest.fn();
const grantPortalEntitlements = jest.fn();
const scheduleSupportWindow = jest.fn();
const runProductionDeployPrep = jest.fn();
const saveBuffer = jest.fn();
const saveText = jest.fn();

jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

jest.mock('../../modules/product-factory/service/product-factory.service', () => ({
  ProductFactoryService: jest.fn().mockImplementation(() => ({
    runAutomatedClientOrder: (...args: unknown[]) => runAutomatedClientOrder(...args),
  })),
}));

jest.mock('../../modules/billing/service/client-deliverable-bootstrap.service', () => ({
  ClientDeliverableBootstrapService: jest.fn().mockImplementation(() => ({
    bootstrapQuickPortal: (...args: unknown[]) => bootstrapQuickPortal(...args),
    seedCrmPipeline: (...args: unknown[]) => seedCrmPipeline(...args),
    activateModules: (...args: unknown[]) => activateModules(...args),
    grantPortalEntitlements: (...args: unknown[]) => grantPortalEntitlements(...args),
    scheduleSupportWindow: (...args: unknown[]) => scheduleSupportWindow(...args),
    runProductionDeployPrep: (...args: unknown[]) => runProductionDeployPrep(...args),
  })),
}));

jest.mock('../../modules/billing/service/deliverable-document-pdf.service', () => ({
  generateDeliverablePdf: jest.fn(async () => ({
    buffer: Buffer.from('%PDF-1.4 setup-test'),
    pageCount: 3,
    byteLength: 16000,
  })),
  generateDeliverablePdfBuffer: jest.fn(async () => Buffer.from('%PDF-1.4 setup-test')),
}));

jest.mock('../../modules/billing/service/deliverable-artifact-store.service', () => ({
  DeliverableArtifactStoreService: jest.fn().mockImplementation(() => ({
    saveBuffer: (...args: unknown[]) => saveBuffer(...args),
    saveText: (...args: unknown[]) => saveText(...args),
  })),
}));

import { setupFulfillmentHandler } from '../../modules/billing/lib/deliverable-handlers/setup.handler';
import {
  buildMigrationCsv,
  buildProductionDeployRunbook,
  buildTrainingOutlineMarkdown,
  trainingOutlineDoc,
} from '../../modules/billing/lib/deliverable-handlers/artifact-helpers';
import { getAcceptanceContract } from '../../modules/billing/lib/deliverable-acceptance-contract';
import { runFulfillmentQualityChecklist } from '../../modules/billing/lib/fulfillment-quality-checklist';
import type { FulfillmentArtifact, FulfillmentContext } from '../../modules/billing/lib/deliverable-handlers/types';

function asArtifact(input: {
  filename: string;
  type: string;
  downloadLabel?: string;
}): FulfillmentArtifact {
  return {
    type: input.type,
    filename: input.filename.replace(/[^a-zA-Z0-9._-]/g, '-'),
    storagePath: `/tmp/artifacts/${input.filename}`,
    downloadLabel: input.downloadLabel ?? input.filename,
  };
}

function ctx(deliverableId: string): FulfillmentContext {
  return {
    paymentId: `pay-${deliverableId}`,
    userId: 'user-setup-test',
    deliverableId,
    jobId: 'job-1',
    clientName: 'Acme Portal Co',
    clientEmail: 'ops@acme.test',
    industryCategory: 'legal-services',
    purchaseType: 'deliverable',
  };
}

const portalEntitlements = {
  modulesActivated: ['notifications', 'billing'],
  userModulesGranted: ['notifications', 'billing'],
  billingAccess: true,
  orgRole: 'owner',
  notificationSeeded: true,
  entitlementSource: 'user_modules+org' as const,
  portalReady: true,
};

const fullEntitlements = {
  ...portalEntitlements,
  modulesActivated: ['crm', 'automation', 'notifications', 'billing'],
  userModulesGranted: ['crm', 'automation', 'notifications', 'billing'],
};

describe('setup handler — acceptance contract artifacts', () => {
  beforeEach(() => {
    runAutomatedClientOrder.mockResolvedValue({ projectId: 'proj-setup-1' });
    bootstrapQuickPortal.mockResolvedValue(portalEntitlements);
    seedCrmPipeline.mockResolvedValue({
      importedLeads: 8,
      pipelineStages: ['lead', 'prospect', 'customer'],
      sampleKind: 'demo_industry_template',
      labeledDemo: true,
    });
    activateModules.mockResolvedValue(['crm', 'automation', 'notifications', 'billing']);
    grantPortalEntitlements.mockResolvedValue(fullEntitlements);
    scheduleSupportWindow.mockResolvedValue(undefined);
    runProductionDeployPrep.mockResolvedValue({
      skipped: true,
      reason: 'local_infrastructure_unavailable',
      sslProvisioned: false,
      domainConfigured: false,
      backupLive: false,
      monitoringLive: false,
    });

    saveBuffer.mockImplementation((input: { filename: string; type: string; downloadLabel?: string }) =>
      asArtifact(input),
    );
    saveText.mockImplementation((input: { filename: string; type: string; downloadLabel?: string }) =>
      asArtifact(input),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('setup-quick covers status, pdf, project, portal entitlements', async () => {
    const result = await setupFulfillmentHandler.fulfill(ctx('setup-quick'));
    const contract = getAcceptanceContract('setup-quick')!;
    const checklist = runFulfillmentQualityChecklist('setup-quick', result);

    expect(result.status).toBe('completed');
    expect(result.projectId).toBe('proj-setup-1');
    expect(result.artifacts.some((a) => a.filename.endsWith('.pdf'))).toBe(true);
    expect(result.artifacts.some((a) => a.type === 'portal_modules')).toBe(true);
    expect(result.metadata?.modulesActivated).toEqual(['notifications', 'billing']);
    expect(result.metadata?.portalReady).toBe(true);
    expect((result.metadata?.portalEntitlements as { entitlementSource?: string })?.entitlementSource).toBe(
      'user_modules+org',
    );
    expect(result.metadata?.documentSubstanceOk).toBe(true);

    for (const criterion of contract.criteria) {
      const item = checklist.items.find((i) => i.id === criterion.id);
      expect(item?.passed).toBe(true);
    }
    expect(checklist.passed).toBe(true);
  });

  it('setup-full covers CRM demo labels, migration CSV, training, honest automation', async () => {
    const result = await setupFulfillmentHandler.fulfill(ctx('setup-full'));
    const contract = getAcceptanceContract('setup-full')!;
    const checklist = runFulfillmentQualityChecklist('setup-full', result);

    expect(result.status).toBe('completed');
    expect(result.artifacts.some((a) => a.type === 'migration_template' && a.filename.endsWith('.csv'))).toBe(
      true,
    );
    expect(result.artifacts.filter((a) => a.type === 'training_outline').length).toBeGreaterThanOrEqual(2);
    expect(result.artifacts.some((a) => a.filename === 'training-outline.pdf')).toBe(true);
    expect(scheduleSupportWindow).toHaveBeenCalled();
    expect(grantPortalEntitlements).toHaveBeenCalled();
    expect(Number((result.metadata?.crmBootstrap as { importedLeads?: number })?.importedLeads)).toBe(8);
    expect((result.metadata?.crmBootstrap as { labeledDemo?: boolean })?.labeledDemo).toBe(true);
    expect((result.metadata?.automationHonesty as { automationConnected?: boolean })?.automationConnected).toBe(
      false,
    );
    expect(result.metadata?.documentSubstanceOk).toBe(true);

    const csvCall = saveText.mock.calls.find(
      (c) => (c[0] as { type?: string }).type === 'migration_template',
    )?.[0] as { content?: string } | undefined;
    expect(csvCall?.content).toContain('first_name,last_name,email');
    expect(csvCall?.content).toContain('DEMO_SAMPLE');
    expect((csvCall?.content ?? '').split('\n').length).toBeGreaterThanOrEqual(10);

    for (const criterion of contract.criteria) {
      const item = checklist.items.find((i) => i.id === criterion.id);
      expect(item?.passed).toBe(true);
    }
    expect(checklist.passed).toBe(true);
  });

  it('setup-custom completes with honest runbook when deploy prep skipped', async () => {
    const result = await setupFulfillmentHandler.fulfill(ctx('setup-custom'));
    const contract = getAcceptanceContract('setup-custom')!;
    const checklist = runFulfillmentQualityChecklist('setup-custom', result);

    expect(result.status).toBe('completed');
    expect(
      result.artifacts.some(
        (a) => a.type === 'production_deploy_manifest' && a.filename.includes('production-deploy'),
      ),
    ).toBe(true);
    expect(runProductionDeployPrep).toHaveBeenCalled();
    expect(result.metadata?.documentSubstanceOk).toBe(true);
    expect((result.metadata?.deployHonesty as { runbookExecutable?: boolean })?.runbookExecutable).toBe(true);
    expect((result.metadata?.deployHonesty as { sslProvisioned?: boolean })?.sslProvisioned).toBe(false);

    const manifestCall = saveText.mock.calls.find(
      (c) => (c[0] as { type?: string }).type === 'production_deploy_manifest',
    )?.[0] as { content?: string } | undefined;
    const manifest = JSON.parse(manifestCall?.content ?? '{}') as {
      kind?: string;
      domainSsl?: { status?: string; claimedDone?: boolean };
      backup?: unknown;
      monitoring?: unknown;
      sla?: unknown;
      honesty?: { sslProvisioned?: boolean };
      checklist?: unknown[];
    };
    expect(manifest.kind).toBe('client_executable_runbook');
    expect(manifest.domainSsl?.status).toBe('PENDING_CLIENT');
    expect(manifest.domainSsl?.claimedDone).toBe(false);
    expect(manifest.honesty?.sslProvisioned).toBe(false);
    expect(manifest.backup).toBeTruthy();
    expect(manifest.monitoring).toBeTruthy();
    expect(manifest.sla).toBeTruthy();
    expect((manifest.checklist ?? []).length).toBeGreaterThanOrEqual(4);

    for (const criterion of contract.criteria) {
      const item = checklist.items.find((i) => i.id === criterion.id);
      expect(item?.passed).toBe(true);
    }
    expect(checklist.passed).toBe(true);
  });

  it('marks setup-quick partial when portal entitlements fail', async () => {
    bootstrapQuickPortal.mockResolvedValueOnce({
      modulesActivated: [],
      userModulesGranted: [],
      billingAccess: false,
      orgRole: null,
      notificationSeeded: false,
      entitlementSource: 'user_modules+org',
      portalReady: false,
    });
    const result = await setupFulfillmentHandler.fulfill(ctx('setup-quick'));
    expect(result.status).toBe('partial');
    expect(result.metadata?.portalReady).toBe(false);
    expect(runFulfillmentQualityChecklist('setup-quick', result).passed).toBe(false);
  });

  it('fails checklist when only portalReady is set without entitlements', () => {
    const checklist = runFulfillmentQualityChecklist('setup-quick', {
      status: 'completed',
      projectId: 'proj-1',
      artifacts: [{ type: 'setup_pack', filename: 'setup-quick.pdf', storagePath: '/x' }],
      metadata: {
        portalReady: true,
        modulesActivated: [],
        documentQuality: {
          sectionCount: 6,
          totalBodyChars: 2000,
          minSectionBodyChars: 150,
          checklistOrMilestoneHits: 2,
          clientNamePresent: true,
          industryPresent: true,
        },
        documentSubstanceOk: true,
      },
    });
    expect(checklist.items.some((i) => i.id === 'portal_modules' && !i.passed)).toBe(true);
    expect(checklist.passed).toBe(false);
  });

  it('fails production_manifest when skipped deploy claims SSL done', () => {
    const checklist = runFulfillmentQualityChecklist('setup-custom', {
      status: 'completed',
      projectId: 'proj-1',
      artifacts: [
        { type: 'setup_pack', filename: 'setup-custom.pdf', storagePath: '/x' },
        {
          type: 'production_deploy_manifest',
          filename: 'production-deploy-manifest.json',
          storagePath: '/p',
        },
      ],
      metadata: {
        modulesActivated: ['crm', 'automation', 'notifications', 'billing'],
        portalEntitlements: fullEntitlements,
        crmBootstrap: { importedLeads: 8, labeledDemo: true },
        deployPrep: { skipped: true },
        deployHonesty: {
          sslProvisioned: true,
          domainConfigured: true,
          runbookExecutable: true,
        },
        documentQuality: {
          sectionCount: 6,
          totalBodyChars: 2000,
          minSectionBodyChars: 150,
          checklistOrMilestoneHits: 2,
          clientNamePresent: true,
          industryPresent: true,
        },
        documentSubstanceOk: true,
      },
    });
    expect(checklist.items.some((i) => i.id === 'production_manifest' && !i.passed)).toBe(true);
    expect(checklist.passed).toBe(false);
  });
});

describe('setup artifact helpers — content shape', () => {
  it('builds substantial migration CSV and training outline with honesty', () => {
    const csv = buildMigrationCsv('Acme, Inc', { industryCategory: 'legal' });
    expect(csv.split('\n').length).toBeGreaterThanOrEqual(10);
    expect(csv).toContain('first_name,last_name,email');
    expect(csv).toContain('DEMO_SAMPLE');
    expect(csv).toContain('Acme  Inc');

    const md = buildTrainingOutlineMarkdown({ clientName: 'Acme', industryCategory: 'legal' });
    expect(md.length).toBeGreaterThan(1200);
    expect(md).toMatch(/Session 1/);
    expect(md).toMatch(/NOT CONNECTED/);

    const doc = trainingOutlineDoc({ clientName: 'Acme', industryCategory: 'legal' });
    expect(doc.sections.length).toBeGreaterThanOrEqual(4);
  });

  it('buildProductionDeployRunbook never claims SSL/domain done when prep skipped', () => {
    const runbook = buildProductionDeployRunbook({
      clientName: 'Acme',
      deliverableId: 'setup-custom',
      deployPrep: { skipped: true, reason: 'local_infrastructure_unavailable' },
    });
    expect(runbook.kind).toBe('client_executable_runbook');
    expect(runbook.honesty.sslProvisioned).toBe(false);
    expect(runbook.honesty.domainConfigured).toBe(false);
    expect(runbook.honesty.runbookExecutable).toBe(true);
    expect(runbook.domainSsl.claimedDone).toBe(false);
    expect(runbook.checklist.length).toBeGreaterThanOrEqual(4);
  });
});
