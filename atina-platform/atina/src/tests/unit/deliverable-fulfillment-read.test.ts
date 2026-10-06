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
