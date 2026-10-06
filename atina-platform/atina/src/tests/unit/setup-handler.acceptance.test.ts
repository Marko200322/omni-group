const runAutomatedClientOrder = jest.fn();
const bootstrapQuickPortal = jest.fn();
const seedCrmPipeline = jest.fn();
const activateModules = jest.fn();
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
    scheduleSupportWindow: (...args: unknown[]) => scheduleSupportWindow(...args),
    runProductionDeployPrep: (...args: unknown[]) => runProductionDeployPrep(...args),
  })),
}));

jest.mock('../../modules/billing/service/deliverable-document-pdf.service', () => ({
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

describe('setup handler — acceptance contract artifacts', () => {
  beforeEach(() => {
    runAutomatedClientOrder.mockResolvedValue({ projectId: 'proj-setup-1' });
    bootstrapQuickPortal.mockResolvedValue(['notifications', 'billing']);
    seedCrmPipeline.mockResolvedValue({ importedLeads: 8, pipelineStages: ['lead', 'prospect', 'customer'] });
    activateModules.mockResolvedValue(['crm', 'automation', 'notifications', 'billing']);
    scheduleSupportWindow.mockResolvedValue(undefined);
    runProductionDeployPrep.mockResolvedValue({ skipped: true, reason: 'local_infrastructure_unavailable' });

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

  it('setup-quick covers status, pdf, project, portal modules', async () => {
    const result = await setupFulfillmentHandler.fulfill(ctx('setup-quick'));
    const contract = getAcceptanceContract('setup-quick')!;
    const checklist = runFulfillmentQualityChecklist('setup-quick', result);

    expect(result.status).toBe('completed');
    expect(result.projectId).toBe('proj-setup-1');
    expect(result.artifacts.some((a) => a.filename.endsWith('.pdf'))).toBe(true);
    expect(result.artifacts.some((a) => a.type === 'portal_modules')).toBe(true);
    expect(result.metadata?.modulesActivated).toEqual(['notifications', 'billing']);
    expect(result.metadata?.portalReady).toBe(true);
    expect(result.metadata?.documentSubstanceOk).toBe(true);

    for (const criterion of contract.criteria) {
      const item = checklist.items.find((i) => i.id === criterion.id);
      expect(item?.passed).toBe(true);
    }
    expect(checklist.passed).toBe(true);
  });

  it('setup-full covers CRM, migration CSV, training outline, modules', async () => {
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
    expect(Number((result.metadata?.crmBootstrap as { importedLeads?: number })?.importedLeads)).toBe(8);
    expect(result.metadata?.documentSubstanceOk).toBe(true);

    const csvCall = saveText.mock.calls.find(
      (c) => (c[0] as { type?: string }).type === 'migration_template',
    )?.[0] as { content?: string } | undefined;
    expect(csvCall?.content).toContain('first_name,last_name,email');

    for (const criterion of contract.criteria) {
      const item = checklist.items.find((i) => i.id === criterion.id);
      expect(item?.passed).toBe(true);
    }
    expect(checklist.passed).toBe(true);
  });

  it('setup-custom covers CRM, production manifest, modules', async () => {
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

    const manifestCall = saveText.mock.calls.find(
      (c) => (c[0] as { type?: string }).type === 'production_deploy_manifest',
    )?.[0] as { content?: string } | undefined;
    const manifest = JSON.parse(manifestCall?.content ?? '{}') as {
      domainSsl?: unknown;
      backup?: unknown;
      monitoring?: unknown;
      sla?: unknown;
    };
    expect(manifest.domainSsl).toBeTruthy();
    expect(manifest.backup).toBeTruthy();
    expect(manifest.monitoring).toBeTruthy();
    expect(manifest.sla).toBeTruthy();

    for (const criterion of contract.criteria) {
      const item = checklist.items.find((i) => i.id === criterion.id);
      expect(item?.passed).toBe(true);
    }
    expect(checklist.passed).toBe(true);
  });

  it('marks setup-quick partial when portal modules fail to activate', async () => {
    bootstrapQuickPortal.mockResolvedValueOnce([]);
    const result = await setupFulfillmentHandler.fulfill(ctx('setup-quick'));
    expect(result.status).toBe('partial');
    expect(result.metadata?.portalReady).toBe(false);
    expect(runFulfillmentQualityChecklist('setup-quick', result).passed).toBe(false);
  });
});

describe('setup artifact helpers — content shape', () => {
  it('builds non-empty migration CSV and training outline', () => {
    const csv = buildMigrationCsv('Acme, Inc');
    expect(csv.split('\n').length).toBeGreaterThanOrEqual(4);
    expect(csv).toContain('first_name,last_name,email');
    expect(csv).toContain('Acme  Inc');

    const md = buildTrainingOutlineMarkdown({ clientName: 'Acme', industryCategory: 'legal' });
    expect(md.length).toBeGreaterThan(200);
    expect(md).toMatch(/Session 1/);

    const doc = trainingOutlineDoc({ clientName: 'Acme', industryCategory: 'legal' });
    expect(doc.sections.length).toBeGreaterThanOrEqual(4);
  });
});
