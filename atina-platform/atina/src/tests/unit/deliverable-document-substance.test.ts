jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

import { DeliverableDocumentGeneratorService } from '../../modules/billing/service/deliverable-document-generator.service';
import { generateDeliverablePdf } from '../../modules/billing/service/deliverable-document-pdf.service';
import {
  assessDocumentQuality,
  documentSubstancePasses,
  pdfSubstancePasses,
  substanceThresholdFor,
} from '../../modules/billing/lib/deliverable-handlers/artifact-helpers';
import {
  industrySubstanceTokenList,
  listIndustryDocumentSubstanceSlugs,
  resolveIndustryDocumentSubstance,
} from '../../modules/billing/lib/industry-document-substance';
import { getCategoryDeliveryProfile } from '../../modules/autonomy-loop/lib/vertical-delivery-profiles';
import { INDUSTRY_CATEGORIES } from '../../modules/billing/lib/category-pricing';

type StructuredDoc = Awaited<ReturnType<DeliverableDocumentGeneratorService['generateAuditReport']>>;

/** ≥12 industries with distinct domain tokens for substance proof. */
const INDUSTRIES = [
  'healthcare',
  'legal',
  'finance',
  'ecommerce',
  'real-estate',
  'education',
  'marketing',
  'construction',
  'logistics',
  'development_it',
  'hr_recruiting',
  'web3',
  'hospitality',
  'manufacturing',
] as const;

function docBlob(doc: StructuredDoc): string {
  return [doc.title, doc.subtitle, ...doc.sections.map((s) => `${s.heading}\n${s.body}`)].join('\n');
}

describe('deliverable document substance (offline fallbacks)', () => {
  const docs = new DeliverableDocumentGeneratorService();
  const clientName = 'Acme Dental Clinic';
  const industryCategory = 'healthcare';

  async function expectSubstance(
    deliverableId: string,
    doc: StructuredDoc,
    industry: string = industryCategory,
  ) {
    const threshold = substanceThresholdFor(deliverableId);
    expect(threshold).toBeTruthy();
    const quality = assessDocumentQuality(doc, { clientName, industryCategory: industry });
    const shortest = Math.min(...doc.sections.map((s) => s.body.trim().length));
    if (!documentSubstancePasses(quality, threshold!, { requireIndustryPresent: true })) {
      throw new Error(
        `${deliverableId}/${industry} substance fail: ${JSON.stringify({ quality, threshold, shortest, headings: doc.sections.map((s) => s.heading) })}`,
      );
    }
    expect(quality.sectionCount).toBeGreaterThanOrEqual(threshold!.minSections);
    expect(quality.totalBodyChars).toBeGreaterThanOrEqual(threshold!.minTotalChars);
    expect(quality.checklistOrMilestoneHits).toBeGreaterThanOrEqual(1);
    expect(quality.clientNamePresent).toBe(true);
    expect(quality.industryPresent).toBe(true);
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

describe('industry-specific doc quality across verticals', () => {
  const docs = new DeliverableDocumentGeneratorService();
  const clientName = 'Northline Partners';

  it('substance overlays cover majority of catalog with distinctive tokens', () => {
    const keys = listIndustryDocumentSubstanceSlugs();
    expect(keys.length).toBeGreaterThanOrEqual(26);
    // Majority of ~50 industry categories resolve to a dedicated overlay (incl. aliases).
    // Default fallback always injects the generic "SMB operations" token.
    let covered = 0;
    for (const cat of INDUSTRY_CATEGORIES) {
      const sub = resolveIndustryDocumentSubstance(cat.slug);
      if (!sub.distinctiveTokens.includes('SMB operations')) covered += 1;
    }
    expect(covered).toBeGreaterThanOrEqual(Math.ceil(INDUSTRY_CATEGORIES.length / 2));
    expect(covered).toBe(INDUSTRY_CATEGORIES.length);

    for (const industry of INDUSTRIES) {
      const sub = resolveIndustryDocumentSubstance(industry);
      expect(sub.distinctiveTokens.length).toBeGreaterThanOrEqual(4);
      expect(sub.complianceChecklist.length).toBeGreaterThanOrEqual(3);
      expect(sub.kpiSet.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('≥12 industries have pairwise-distinct distinctive tokens', () => {
    expect(INDUSTRIES.length).toBeGreaterThanOrEqual(12);
    const tokenSets = INDUSTRIES.map((industry) => ({
      industry,
      tokens: new Set(industrySubstanceTokenList(industry).map((t) => t.toLowerCase())),
    }));
    for (let i = 0; i < tokenSets.length; i += 1) {
      for (let j = i + 1; j < tokenSets.length; j += 1) {
        const a = tokenSets[i]!;
        const b = tokenSets[j]!;
        const overlap = [...a.tokens].filter((t) => b.tokens.has(t));
        expect(overlap.length).toBeLessThan(Math.min(a.tokens.size, b.tokens.size));
        const aOnly = [...a.tokens].filter((t) => !b.tokens.has(t));
        const bOnly = [...b.tokens].filter((t) => !a.tokens.has(t));
        expect(aOnly.length).toBeGreaterThanOrEqual(2);
        expect(bOnly.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it.each([...INDUSTRIES])(
    '%s: audit/workflow/integration/sales/setup pass substance + industry tokens',
    async (industry) => {
      const tokens = industrySubstanceTokenList(industry);
      expect(tokens.length).toBeGreaterThanOrEqual(4);

      const generators: Array<{
        id: string;
        run: () => Promise<StructuredDoc>;
      }> = [
        { id: 'audit', run: () => docs.generateAuditReport({ clientName, industryCategory: industry }) },
        {
          id: 'workflow-design',
          run: () => docs.generateWorkflowDesign({ clientName, industryCategory: industry }),
        },
        {
          id: 'integration',
          run: () => docs.generateIntegrationGuide({ clientName, industryCategory: industry }),
        },
        {
          id: 'sales-enablement',
          run: () => docs.generateSalesEnablement({ clientName, industryCategory: industry }),
        },
        {
          id: 'setup-full',
          run: () =>
            docs.generateSetupPack({ tier: 'full', clientName, industryCategory: industry }),
        },
      ];

      for (const g of generators) {
        const doc = await g.run();
        const threshold = substanceThresholdFor(g.id)!;
        const quality = assessDocumentQuality(doc, { clientName, industryCategory: industry });
        expect(documentSubstancePasses(quality, threshold, { requireIndustryPresent: true })).toBe(
          true,
        );

        const blob = docBlob(doc).toLowerCase();
        const hits = tokens.filter((t) => blob.includes(t.toLowerCase()));
        if (hits.length < 3) {
          throw new Error(
            `${industry}/${g.id} expected ≥3 tokens from ${JSON.stringify(tokens)}; got ${JSON.stringify(hits)}`,
          );
        }
        expect(hits.length).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it('PDFs differ meaningfully across industries (not a single word swap)', async () => {
    const pairs: Array<[string, string]> = [
      ['healthcare', 'legal'],
      ['finance', 'ecommerce'],
      ['real-estate', 'education'],
    ];

    for (const [a, b] of pairs) {
      const docA = await docs.generateAuditReport({ clientName, industryCategory: a });
      const docB = await docs.generateAuditReport({ clientName, industryCategory: b });
      const blobA = docBlob(docA).toLowerCase();
      const blobB = docBlob(docB).toLowerCase();

      const tokensA = industrySubstanceTokenList(a);
      const tokensB = industrySubstanceTokenList(b);

      const aOnly = tokensA.filter(
        (t) => blobA.includes(t.toLowerCase()) && !blobB.includes(t.toLowerCase()),
      );
      const bOnly = tokensB.filter(
        (t) => blobB.includes(t.toLowerCase()) && !blobA.includes(t.toLowerCase()),
      );

      expect(aOnly.length).toBeGreaterThanOrEqual(2);
      if (aOnly.length < 2) {
        throw new Error(`${a} vs ${b}: expected unique ${a} tokens; aOnly=${JSON.stringify(aOnly)}`);
      }
      expect(bOnly.length).toBeGreaterThanOrEqual(2);
      if (bOnly.length < 2) {
        throw new Error(`${a} vs ${b}: expected unique ${b} tokens; bOnly=${JSON.stringify(bOnly)}`);
      }

      // Bodies must diverge substantially (not just industry label).
      const sharedPrefix = (() => {
        let i = 0;
        const max = Math.min(blobA.length, blobB.length);
        while (i < max && blobA[i] === blobB[i]) i += 1;
        return i;
      })();
      expect(sharedPrefix / Math.max(blobA.length, 1)).toBeLessThan(0.55);
    }
  });

  it('legacy SMB profiles for focus industries are not generic name-swaps', () => {
    const healthcare = getCategoryDeliveryProfile('healthcare');
    const legal = getCategoryDeliveryProfile('legal');
    const finance = getCategoryDeliveryProfile('finance');
    expect(healthcare.workflowSteps.map((s) => s.step).join('|')).not.toEqual(
      legal.workflowSteps.map((s) => s.step).join('|'),
    );
    expect(healthcare.researchFocus.join('|')).not.toEqual(finance.researchFocus.join('|'));
    expect(healthcare.baseKeywords.some((k) => /hipaa|phi|patient/i.test(k))).toBe(true);
    expect(legal.baseKeywords.some((k) => /matter|conflict|retainer/i.test(k))).toBe(true);
    expect(finance.baseKeywords.some((k) => /kyc|aml|reconcil/i.test(k))).toBe(true);
  });
});

describe('handoff PDF size / page floors (audit, setup, landing)', () => {
  const docs = new DeliverableDocumentGeneratorService();
  const clientName = 'Northline Partners';

  async function expectPdfFloor(
    deliverableId: string,
    industry: string,
    doc: Awaited<ReturnType<DeliverableDocumentGeneratorService['generateAuditReport']>>,
  ) {
    const threshold = substanceThresholdFor(deliverableId)!;
    expect(threshold.minPdfBytes).toBeGreaterThan(0);
    expect(threshold.minPdfPages).toBeGreaterThan(0);

    const quality = assessDocumentQuality(doc, {
      clientName,
      industryCategory: industry,
    });
    expect(documentSubstancePasses(quality, threshold, { requireIndustryPresent: true })).toBe(true);

    const pdf = await generateDeliverablePdf({
      brandName: 'Omni Group',
      title: doc.title,
      subtitle: doc.subtitle,
      clientName,
      deliverableName: deliverableId,
      sections: doc.sections,
    });
    if (!pdfSubstancePasses({ pdfBytes: pdf.byteLength, pdfPageCount: pdf.pageCount }, threshold)) {
      throw new Error(
        `${deliverableId} PDF too thin: ${pdf.byteLength}B / ${pdf.pageCount}p vs min ${threshold.minPdfBytes}B / ${threshold.minPdfPages}p (sections=${doc.sections.length}, chars=${quality.totalBodyChars})`,
      );
    }
    expect(pdf.byteLength).toBeGreaterThanOrEqual(threshold.minPdfBytes!);
    expect(pdf.pageCount).toBeGreaterThanOrEqual(threshold.minPdfPages!);
    expect(doc.sections.length).toBeGreaterThanOrEqual(threshold.minSections);
  }

  it('audit PDF meets min bytes/pages', async () => {
    const doc = await docs.generateAuditReport({
      clientName,
      industryCategory: 'healthcare',
    });
    await expectPdfFloor('audit', 'healthcare', doc);
  });

  it('setup-quick PDF meets min bytes/pages', async () => {
    const doc = await docs.generateSetupPack({
      tier: 'quick',
      clientName,
      industryCategory: 'marketing',
    });
    await expectPdfFloor('setup-quick', 'marketing', doc);
  });

  it('landing handoff PDF meets min bytes/pages + industry tokens', async () => {
    const industry = 'construction';
    const doc = await docs.generateSiteDeliveryPack({
      deliverableId: 'landing',
      clientName,
      industryCategory: industry,
      publicUrl: '/sites/northline-demo',
      absoluteUrl: 'https://omnigrouptech.com/sites/northline-demo',
      pageCount: 1,
    });
    await expectPdfFloor('landing', industry, doc);
    const blob = docBlob(doc).toLowerCase();
    const tokens = industrySubstanceTokenList(industry);
    const hits = tokens.filter((t) => blob.includes(t.toLowerCase()));
    expect(hits.length).toBeGreaterThanOrEqual(3);
  });
});
