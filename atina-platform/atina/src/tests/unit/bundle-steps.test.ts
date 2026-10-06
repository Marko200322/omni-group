import { runFulfillmentQualityChecklist } from '../../modules/billing/lib/fulfillment-quality-checklist';
import {
  expectedBundleStepIds,
  mergeBundleResults,
  type BundleStepResult,
} from '../../modules/billing/lib/deliverable-handlers/bundle-steps';
import type { FulfillmentResult } from '../../modules/billing/lib/deliverable-handlers/types';

function docQuality(chars = 2500) {
  return {
    documentTitle: 'Doc',
    documentQuality: {
      sectionCount: 6,
      totalBodyChars: chars,
      minSectionBodyChars: 200,
      checklistOrMilestoneHits: 3,
      clientNamePresent: true,
      industryPresent: true,
    },
    documentSubstanceOk: true,
  };
}

describe('bundle step coverage', () => {
  it('declares expected child steps for all three catalog bundles', () => {
    expect(expectedBundleStepIds('bundle-portal-presence')).toEqual(['setup-quick', 'landing']);
    expect(expectedBundleStepIds('bundle-sales-launch')).toEqual(['landing', 'sales-enablement']);
    expect(expectedBundleStepIds('bundle-ops-clarity')).toEqual(['audit', 'workflow-design']);
  });

  it('portal-presence completes only when both steps succeed and keeps portal modules', () => {
    const expected = expectedBundleStepIds('bundle-portal-presence');
    const setup: FulfillmentResult = {
      status: 'completed',
      projectId: 'setup-proj',
      artifacts: [
        { type: 'pdf', filename: 'setup-quick.pdf', storagePath: '/s' },
        { type: 'md', filename: 'setup.md', storagePath: '/sm' },
      ],
      metadata: {
        setupTier: 'quick',
        modulesActivated: ['notifications', 'billing'],
        portalReady: true,
        ...docQuality(),
      },
    };
    const landing: FulfillmentResult = {
      status: 'completed',
      projectId: 'landing-proj',
      publicUrl: '/sites/acme',
      artifacts: [{ type: 'pdf', filename: 'landing-delivery.pdf', storagePath: '/l' }],
      metadata: {
        liveProbe: { ok: true, status: 200, bytes: 2000, detectedTitle: 'Acme' },
        brandTitle: 'Acme',
        siteTitle: 'Acme',
      },
    };
    const stepResults: BundleStepResult[] = [
      { deliverableId: 'setup-quick', status: 'completed', artifactCount: 2, projectId: 'setup-proj' },
      {
        deliverableId: 'landing',
        status: 'completed',
        artifactCount: 1,
        publicUrl: '/sites/acme',
        projectId: 'landing-proj',
      },
    ];
    const merged = mergeBundleResults('bundle-portal-presence', expected, [setup, landing], stepResults);
    expect(merged.status).toBe('completed');
    expect(merged.projectId).toBe('setup-proj');
    expect(merged.publicUrl).toBe('/sites/acme');
    expect(merged.metadata?.modulesActivated).toEqual(['notifications', 'billing']);
    expect(merged.artifacts).toHaveLength(3);
    expect(runFulfillmentQualityChecklist('bundle-portal-presence', merged).passed).toBe(true);
  });

  it('sales-launch is partial when landing fails but still keeps sales artifacts', () => {
    const expected = expectedBundleStepIds('bundle-sales-launch');
    const landing: FulfillmentResult = {
      status: 'partial',
      artifacts: [],
      metadata: { stepError: 'live probe failed' },
    };
    const sales: FulfillmentResult = {
      status: 'completed',
      artifacts: [
        { type: 'pdf', filename: 'sales-enablement.pdf', storagePath: '/s' },
        { type: 'md', filename: 'sales-enablement_md.md', storagePath: '/sm' },
      ],
      metadata: { ...docQuality(), salesPackReady: true },
    };
    const stepResults: BundleStepResult[] = [
      { deliverableId: 'landing', status: 'partial', artifactCount: 0, error: 'live probe failed' },
      { deliverableId: 'sales-enablement', status: 'completed', artifactCount: 2 },
    ];
    const merged = mergeBundleResults('bundle-sales-launch', expected, [landing, sales], stepResults);
    expect(merged.status).toBe('partial');
    expect(merged.artifacts).toHaveLength(2);
    expect(merged.metadata?.reason).toBe('bundle_step_failed');
    expect(runFulfillmentQualityChecklist('bundle-sales-launch', merged).passed).toBe(false);
  });

  it('ops-clarity requires dual PDFs and both completed steps', () => {
    const expected = expectedBundleStepIds('bundle-ops-clarity');
    const audit: FulfillmentResult = {
      status: 'completed',
      artifacts: [
        { type: 'audit_report', filename: 'technical-audit.pdf', storagePath: '/a' },
        { type: 'audit_report_md', filename: 'audit_report_md.md', storagePath: '/am' },
      ],
      metadata: docQuality(2400),
    };
    const workflow: FulfillmentResult = {
      status: 'completed',
      artifacts: [
        { type: 'workflow_design', filename: 'workflow-sop-pack.pdf', storagePath: '/w' },
        { type: 'workflow_design_md', filename: 'workflow_design_md.md', storagePath: '/wm' },
      ],
      metadata: docQuality(2200),
    };
    const stepResults: BundleStepResult[] = [
      { deliverableId: 'audit', status: 'completed', artifactCount: 2 },
      { deliverableId: 'workflow-design', status: 'completed', artifactCount: 2 },
    ];
    const merged = mergeBundleResults('bundle-ops-clarity', expected, [audit, workflow], stepResults);
    expect(merged.status).toBe('completed');
    expect(merged.artifacts.filter((a) => a.filename.endsWith('.pdf'))).toHaveLength(2);
    expect(runFulfillmentQualityChecklist('bundle-ops-clarity', merged).passed).toBe(true);
  });

  it('quality checklist fails when bundleSteps are incomplete', () => {
    const r = runFulfillmentQualityChecklist('bundle-portal-presence', {
      status: 'completed',
      publicUrl: '/sites/x',
      projectId: 'p',
      artifacts: [{ type: 'pdf', filename: 'x.pdf', storagePath: '/x' }],
      metadata: {
        modulesActivated: ['notifications'],
        liveProbe: { ok: true, status: 200, bytes: 1000, detectedTitle: 'Acme' },
        siteTitle: 'Acme',
        bundleSteps: [{ deliverableId: 'setup-quick', status: 'partial', artifactCount: 1 }],
      },
    });
    expect(r.passed).toBe(false);
    expect(r.items.some((i) => i.id === 'bundle_steps_complete' && !i.passed)).toBe(true);
  });
});
