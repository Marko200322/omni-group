jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

import { DeliverableDocumentGeneratorService } from '../../modules/billing/service/deliverable-document-generator.service';
import {
  assessDocumentQuality,
  documentSubstancePasses,
  substanceThresholdFor,
} from '../../modules/billing/lib/deliverable-handlers/artifact-helpers';

describe('deliverable document substance (offline fallbacks)', () => {
  const docs = new DeliverableDocumentGeneratorService();
  const clientName = 'Acme Dental Clinic';
  const industryCategory = 'healthcare';

  async function expectSubstance(
    deliverableId: string,
    doc: Awaited<ReturnType<DeliverableDocumentGeneratorService['generateAuditReport']>>,
  ) {
    const threshold = substanceThresholdFor(deliverableId);
    expect(threshold).toBeTruthy();
    const quality = assessDocumentQuality(doc, { clientName, industryCategory });
    const shortest = Math.min(...doc.sections.map((s) => s.body.trim().length));
    if (!documentSubstancePasses(quality, threshold!)) {
      throw new Error(
        `${deliverableId} substance fail: ${JSON.stringify({ quality, threshold, shortest, headings: doc.sections.map((s) => s.heading) })}`,
      );
    }
    expect(quality.sectionCount).toBeGreaterThanOrEqual(threshold!.minSections);
    expect(quality.totalBodyChars).toBeGreaterThanOrEqual(threshold!.minTotalChars);
    expect(quality.checklistOrMilestoneHits).toBeGreaterThanOrEqual(1);
    expect(quality.clientNamePresent).toBe(true);
  }

  it('audit fallback is substantial and industry-aware', async () => {
    const doc = await docs.generateAuditReport({ clientName, industryCategory });
    await expectSubstance('audit', doc);
  });

  it('workflow-design fallback includes SOP milestones', async () => {
    const doc = await docs.generateWorkflowDesign({ clientName, industryCategory });
    await expectSubstance('workflow-design', doc);
  });

  it('integration guide fallback includes go-live checklist', async () => {
    const doc = await docs.generateIntegrationGuide({ clientName, industryCategory });
    await expectSubstance('integration', doc);
  });

  it('setup packs are substantial per tier', async () => {
    for (const tier of ['quick', 'full', 'custom'] as const) {
      const doc = await docs.generateSetupPack({
        tier,
        clientName,
        industryCategory,
      });
      await expectSubstance(`setup-${tier}`, doc);
    }
  });

  it('sales-enablement fallback includes demo script + closing checklist', async () => {
    const doc = await docs.generateSalesEnablement({ clientName, industryCategory });
    await expectSubstance('sales-enablement', doc);
  });

  it('software handoff fallback includes test milestones', async () => {
    const doc = await docs.generateSoftwareHandoff({
      clientName,
      projectName: 'Custom Software',
      description: `${clientName} needs a booking + CRM sync app for ${industryCategory} operations with clear acceptance criteria.`,
      outputDir: 'product-factory-output/acme',
      industryCategory,
    });
    await expectSubstance('custom-software', doc);
  });
});
