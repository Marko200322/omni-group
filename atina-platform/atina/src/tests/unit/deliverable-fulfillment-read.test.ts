import type { FulfillmentJobRow } from '../../modules/billing/repository/deliverable-fulfillment.repository';
import { toFulfillmentJobView } from '../../modules/billing/service/deliverable-fulfillment-read.service';
import { normalizeFulfillmentIndustry } from '../../modules/billing/service/deliverable-fulfillment.service';

function baseRow(overrides: Partial<FulfillmentJobRow> = {}): FulfillmentJobRow {
  const now = new Date('2026-10-06T12:00:00.000Z');
  return {
    id: 'job-1',
    payment_id: 'pay-1',
    user_id: 'user-1',
    purchase_type: 'deliverable',
    deliverable_id: 'workflow-design',
    plan_slug: null,
    status: 'completed',
    review_status: 'approved',
    review_notes: null,
    released_at: now,
    result: {},
    error: null,
    created_at: now,
    updated_at: now,
    completed_at: now,
    ...overrides,
  };
}

describe('fulfillment admin API metadata shape', () => {
  it('exposes industryCategory + documentQuality summary from result.metadata', () => {
    const view = toFulfillmentJobView(
      baseRow({
        result: {
          artifacts: [
            {
              type: 'workflow_design',
              filename: 'workflow-sop-pack.pdf',
              downloadLabel: 'Workflow SOP',
              storagePath: '/tmp/x.pdf',
            },
          ],
          metadata: {
            industryCategory: 'healthcare',
            documentSubstanceOk: true,
            documentQuality: {
              sectionCount: 6,
              totalBodyChars: 3200,
              minSectionBodyChars: 180,
              checklistOrMilestoneHits: 4,
              clientNamePresent: true,
              industryPresent: true,
            },
          },
        },
      }),
    );

    expect(view.industryCategory).toBe('healthcare');
    expect(view.documentSubstanceOk).toBe(true);
    expect(view.documentQuality).toEqual({
      sectionCount: 6,
      totalBodyChars: 3200,
      minSectionBodyChars: 180,
      checklistOrMilestoneHits: 4,
      clientNamePresent: true,
      industryPresent: true,
    });
    expect(view.artifacts).toHaveLength(1);
    expect(view.artifacts[0]?.filename).toBe('workflow-sop-pack.pdf');
  });

  it('treats blank industryCategory as null (no silent empty string)', () => {
    const view = toFulfillmentJobView(
      baseRow({
        result: {
          metadata: {
            industryCategory: '   ',
            documentSubstanceOk: false,
          },
        },
      }),
    );
    expect(view.industryCategory).toBeNull();
    expect(view.documentQuality).toBeNull();
    expect(view.documentSubstanceOk).toBe(false);
  });

  it('reads top-level industryCategory fallback when metadata omits it', () => {
    const view = toFulfillmentJobView(
      baseRow({
        result: {
          industryCategory: 'marketing',
          metadata: {
            documentQuality: {
              sectionCount: 5,
              totalBodyChars: 2100,
              minSectionBodyChars: 150,
              checklistOrMilestoneHits: 2,
              clientNamePresent: true,
              industryPresent: true,
            },
          },
        },
      }),
    );
    expect(view.industryCategory).toBe('marketing');
    expect(view.documentQuality?.sectionCount).toBe(5);
  });

  it('exposes checklistScore/checklistPassed from result.fulfillmentMeta (anti fake-pass)', () => {
    const view = toFulfillmentJobView(
      baseRow({
        result: {
          publicUrl: '/sites/fitness-studio-abc',
          fulfillmentMeta: {
            attemptNumber: 1,
            checklist: { score: 92, passed: true, items: [] },
          },
        },
      }),
    );
    expect(view.checklistScore).toBe(92);
    expect(view.checklistPassed).toBe(true);
    expect(view.publicUrl).toBe('/sites/fitness-studio-abc');
    expect(view.checklistFailedIds).toEqual([]);
  });

  it('exposes opsEvidence for retainer/vertical LIVE proof (tickets/CRM/RAG/problems)', () => {
    const view = toFulfillmentJobView(
      baseRow({
        deliverable_id: 'ai-support-retainer__technology',
        result: {
          metadata: {
            industryCategory: 'technology',
            problemsCovered: ['a', 'b', 'c', 'd', 'e'],
            problemsCoveredCount: 5,
            problemsEmbeddedInDoc: true,
            kickoffTicketId: 'ticket-abc',
            crmBootstrap: { importedLeads: 3, pipelineSeeded: true },
            leadGenStats: {
              mode: 'kickoff_pack_only',
              leadsGenerated: 0,
              sampleLeadsSeeded: 3,
              analysis: { rulesVersion: 'hot-v1' },
            },
            aiSupportSetup: { ragSeeded: true, ragRecallHits: 2 },
            supportAutomation: { slaHours: 24 },
          },
          fulfillmentMeta: {
            checklist: {
              score: 100,
              passed: true,
              items: [
                { id: 'min_problems_covered', passed: true },
                { id: 'kickoff_ticket', passed: true },
              ],
            },
          },
        },
      }),
    );
    expect(view.opsEvidence.problemsCoveredCount).toBe(5);
    expect(view.opsEvidence.problemsEmbeddedInDoc).toBe(true);
    expect(view.opsEvidence.kickoffTicketId).toBe('ticket-abc');
    expect(view.opsEvidence.crmImportedLeads).toBe(3);
    expect(view.opsEvidence.crmPipelineSeeded).toBe(true);
    expect(view.opsEvidence.leadGenMode).toBe('kickoff_pack_only');
    expect(view.opsEvidence.leadsGenerated).toBe(0);
    expect(view.opsEvidence.analysisRulesVersion).toBe('hot-v1');
    expect(view.opsEvidence.ragSeeded).toBe(true);
    expect(view.opsEvidence.ragRecallHits).toBe(2);
    expect(view.opsEvidence.supportSlaHours).toBe(24);
    expect(view.checklistFailedIds).toEqual([]);
  });

  it('returns null checklist fields when fulfillmentMeta is absent', () => {
    const view = toFulfillmentJobView(baseRow({ result: { artifacts: [] } }));
    expect(view.checklistScore).toBeNull();
    expect(view.checklistPassed).toBeNull();
  });

  it('parses string checklist score and failed passed flag', () => {
    const view = toFulfillmentJobView(
      baseRow({
        result: {
          fulfillmentMeta: {
            checklist: { score: '77', passed: false, items: [{ id: 'x', passed: false }] },
          },
        },
      }),
    );
    expect(view.checklistScore).toBe(77);
    expect(view.checklistPassed).toBe(false);
  });

  it('returns null checklistScore when score is non-numeric', () => {
    const view = toFulfillmentJobView(
      baseRow({
        result: {
          fulfillmentMeta: {
            checklist: { score: '', passed: true, items: [] },
          },
        },
      }),
    );
    expect(view.checklistScore).toBeNull();
    expect(view.checklistPassed).toBe(true);
  });

  it('exposes bundleSteps from result.metadata for LIVE child-step proof', () => {
    const view = toFulfillmentJobView(
      baseRow({
        deliverable_id: 'bundle-portal-presence__fitness',
        result: {
          metadata: {
            industryCategory: 'fitness',
            bundleSteps: [
              { deliverableId: 'setup-quick', status: 'completed', artifactCount: 3 },
              {
                deliverableId: 'landing',
                status: 'completed',
                artifactCount: 2,
                publicUrl: '/sites/fitness-studio-x',
              },
            ],
          },
          fulfillmentMeta: {
            checklist: { score: 100, passed: true, items: [{ id: 'bundle_steps_complete', passed: true }] },
          },
        },
      }),
    );
    expect(view.bundleSteps).toEqual([
      { deliverableId: 'setup-quick', status: 'completed', artifactCount: 3 },
      {
        deliverableId: 'landing',
        status: 'completed',
        artifactCount: 2,
        publicUrl: '/sites/fitness-studio-x',
      },
    ]);
    expect(view.checklistScore).toBe(100);
  });

  it('returns null bundleSteps when metadata omits them', () => {
    const view = toFulfillmentJobView(baseRow({ result: { artifacts: [] } }));
    expect(view.bundleSteps).toBeNull();
  });
});

describe('normalizeFulfillmentIndustry', () => {
  it('keeps provided industry and drops blanks', () => {
    expect(normalizeFulfillmentIndustry('healthcare')).toBe('healthcare');
    expect(normalizeFulfillmentIndustry('  legal  ')).toBe('legal');
    expect(normalizeFulfillmentIndustry('')).toBeNull();
    expect(normalizeFulfillmentIndustry('   ')).toBeNull();
    expect(normalizeFulfillmentIndustry(null)).toBeNull();
    expect(normalizeFulfillmentIndustry(undefined)).toBeNull();
  });
});
