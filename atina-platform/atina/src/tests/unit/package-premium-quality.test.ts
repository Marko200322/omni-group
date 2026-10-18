jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

import { DeliverableDocumentGeneratorService } from '../../modules/billing/service/deliverable-document-generator.service';
import {
  DeliverableContentGeneratorService,
  assessGeneratedSiteQuality,
} from '../../modules/billing/service/deliverable-content-generator.service';
import {
  assessDocumentQuality,
  DOC_SUBSTANCE_THRESHOLDS,
  documentSubstancePasses,
} from '../../modules/billing/lib/deliverable-handlers/artifact-helpers';
import { buildOrderIdentity, docBodyBlob } from '../../modules/billing/lib/order-identity';

/** Premium floors above bare DOC_SUBSTANCE — packages must feel client-ready, not stub. */
const PREMIUM_FLOOR: Record<string, { minChars: number; minSections: number }> = {
  audit: { minChars: 5000, minSections: 8 },
  'workflow-design': { minChars: 2800, minSections: 5 },
  integration: { minChars: 2800, minSections: 7 },
  'setup-quick': { minChars: 3500, minSections: 7 },
  'setup-full': { minChars: 2800, minSections: 5 },
  'sales-enablement': { minChars: 2500, minSections: 5 },
};

describe('package premium quality (fallback generators)', () => {
  const docs = new DeliverableDocumentGeneratorService();
  const sites = new DeliverableContentGeneratorService();
  const order = buildOrderIdentity('pay-quality-probe-99aa', 'job-quality');

  const cases = [
    ['audit', 'Acme Dental Group', 'healthcare'],
    ['workflow-design', 'North Logistics', 'logistics'],
    ['integration', 'River Clinic', 'healthcare'],
    ['setup-quick', 'Peak Fitness Co', 'fitness'],
    ['setup-full', 'Harbor Legal LLP', 'legal'],
    ['sales-enablement', 'Bright Realty', 'real_estate'],
  ] as const;

  for (const [id, client, industry] of cases) {
    it(`${id} is thick, branded, order-bound for ${client}`, async () => {
      const hints = { orderIdentity: order };
      let doc;
      if (id === 'audit') {
        doc = await docs.generateAuditReport({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      } else if (id === 'workflow-design') {
        doc = await docs.generateWorkflowDesign({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      } else if (id === 'integration') {
        doc = await docs.generateIntegrationGuide({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      } else if (id === 'setup-quick') {
        doc = await docs.generateSetupPack({
          tier: 'quick',
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      } else if (id === 'setup-full') {
        doc = await docs.generateSetupPack({
          tier: 'full',
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      } else {
        doc = await docs.generateSalesEnablement({
          clientName: client,
          industryCategory: industry,
          generationHints: hints,
        });
      }

      const q = assessDocumentQuality(doc, { clientName: client, industryCategory: industry });
      const thr = DOC_SUBSTANCE_THRESHOLDS[id];
      const premium = PREMIUM_FLOOR[id];
      const blob = docBodyBlob(doc);

      expect(documentSubstancePasses(q, thr)).toBe(true);
      expect(q.sectionCount).toBeGreaterThanOrEqual(premium.minSections);
      expect(q.totalBodyChars).toBeGreaterThanOrEqual(premium.minChars);
      expect(q.clientNamePresent).toBe(true);
      expect(blob).toContain(client);
      expect(blob).toContain(order.shortRef);
      expect(blob).not.toMatch(/lorem ipsum|TODO:\s*fill|placeholder copy|\[insert /i);
      expect(blob).not.toMatch(/Digital presence\s*[—-]/);
    });
  }

  it('website-business home is premium-thick and branded', async () => {
    const pages = await sites.generateWebsitePages({
      deliverableId: 'website-business',
      title: 'Cedar Dental',
      clientName: 'Cedar Dental',
      industryCategory: 'healthcare',
      generationHints: { orderIdentity: order },
    });
    const aq = assessGeneratedSiteQuality({
      pages,
      brandName: 'Cedar Dental',
      deliverableId: 'website-business',
    });
    const home = pages.find((p) => p.slug === 'home' || p.kind === 'home');
    expect(aq.ok).toBe(true);
    expect(home?.body.length ?? 0).toBeGreaterThanOrEqual(480);
    expect(home?.body).toContain(order.shortRef);
    expect(home?.body).toMatch(/Cedar Dental/);
  });

  it('landing home meets landing thickness', async () => {
    const pages = await sites.generateWebsitePages({
      deliverableId: 'landing',
      title: 'Summit Roofing',
      clientName: 'Summit Roofing',
      industryCategory: 'construction',
      generationHints: { orderIdentity: order },
    });
    const aq = assessGeneratedSiteQuality({
      pages,
      brandName: 'Summit Roofing',
      deliverableId: 'landing',
    });
    const home = pages.find((p) => p.slug === 'home' || p.kind === 'home');
    expect(aq.ok).toBe(true);
    expect(home?.body.length ?? 0).toBeGreaterThanOrEqual(480);
  });
});
