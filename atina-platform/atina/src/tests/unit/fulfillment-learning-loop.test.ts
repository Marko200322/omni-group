import {
  runFulfillmentQualityChecklist,
  formatChecklistFailures,
} from '../../modules/billing/lib/fulfillment-quality-checklist';
import type { FulfillmentResult } from '../../modules/billing/lib/deliverable-handlers/types';

describe('fulfillment quality checklist', () => {
  it('passes website-business with public URL and project', () => {
    const result: FulfillmentResult = {
      status: 'completed',
      publicUrl: '/sites/acme',
      projectId: 'proj-1',
      artifacts: [],
    };
    const checklist = runFulfillmentQualityChecklist('website-business', result);
    expect(checklist.passed).toBe(true);
    expect(checklist.score).toBeGreaterThanOrEqual(80);
  });

  it('fails website-business without public URL', () => {
    const result: FulfillmentResult = {
      status: 'completed',
      artifacts: [],
    };
    const checklist = runFulfillmentQualityChecklist('website-business', result);
    expect(checklist.passed).toBe(false);
    expect(formatChecklistFailures(checklist)).toContain('public_url');
  });

  it('passes audit with PDF artifact', () => {
    const result: FulfillmentResult = {
      status: 'completed',
      artifacts: [{ type: 'audit_report', filename: 'audit.pdf', storagePath: '/tmp/audit.pdf' }],
    };
    const checklist = runFulfillmentQualityChecklist('audit', result);
    expect(checklist.passed).toBe(true);
  });

  it('passes setup-full with CRM and migration artifacts', () => {
    const result: FulfillmentResult = {
      status: 'completed',
      projectId: 'proj-1',
      artifacts: [
        { type: 'setup_pack', filename: 'setup.pdf', storagePath: '/tmp/setup.pdf' },
        { type: 'migration_template', filename: 'crm-migration-template.csv', storagePath: '/tmp/m.csv' },
        { type: 'training_outline', filename: 'training-outline.md', storagePath: '/tmp/t.md' },
      ],
      metadata: { crmBootstrap: { importedLeads: 8 }, modulesActivated: ['crm'] },
    };
    const checklist = runFulfillmentQualityChecklist('setup-full', result);
    expect(checklist.passed).toBe(true);
  });

  it('fails setup-quick without PDF or project', () => {
    const result: FulfillmentResult = {
      status: 'completed',
      artifacts: [],
    };
    const checklist = runFulfillmentQualityChecklist('setup-quick', result);
    expect(checklist.passed).toBe(false);
  });
});

describe('DeliverableFulfillmentRepository.readAttemptNumber', () => {
  it('reads attempt from fulfillmentMeta', async () => {
    const { DeliverableFulfillmentRepository } = await import(
      '../../modules/billing/repository/deliverable-fulfillment.repository'
    );
    expect(
      DeliverableFulfillmentRepository.readAttemptNumber({
        fulfillmentMeta: { attemptNumber: 2 },
      }),
    ).toBe(2);
    expect(DeliverableFulfillmentRepository.readAttemptNumber({})).toBe(1);
  });
});

describe('mergeHintsIntoPayload', () => {
  it('merges memory and retry hints', async () => {
    const { mergeHintsIntoPayload } = await import(
      '../../modules/billing/lib/fulfillment-generation-hints'
    );
    const out = mergeHintsIntoPayload(
      { clientName: 'Acme' },
      { memoryHints: ['Industry: retail'], retryNotes: 'Fix contact page', attemptNumber: 2 },
    );
    expect(out.priorSuccessPatterns).toEqual(['Industry: retail']);
    expect(out.qaCorrectionNotes).toBe('Fix contact page');
    expect(out.retryAttempt).toBe(2);
  });
});
