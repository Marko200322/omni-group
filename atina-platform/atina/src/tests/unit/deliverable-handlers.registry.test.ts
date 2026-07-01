import { resolveDeliverableFulfillmentHandler, listDeliverableFulfillmentHandlers } from '../../modules/billing/lib/deliverable-handlers/registry';
import { DELIVERABLE_CATALOG } from '../../modules/billing/lib/deliverable-catalog';
import { allDeliverableIdsInContract } from '../../modules/billing/lib/deliverable-acceptance-contract';
import { generateDeliverablePdfBuffer } from '../../modules/billing/service/deliverable-document-pdf.service';

describe('deliverable fulfillment registry', () => {
  it('covers all 17 catalog deliverables', () => {
    const covered = new Set<string>();
    for (const handler of listDeliverableFulfillmentHandlers()) {
      for (const id of handler.ids) covered.add(id);
    }
    for (const d of DELIVERABLE_CATALOG) {
      expect(covered.has(d.id)).toBe(true);
    }
    expect(covered.size).toBe(17);
  });

  it('has acceptance contract for all 17 deliverables', () => {
    expect(allDeliverableIdsInContract().length).toBe(17);
    for (const id of allDeliverableIdsInContract()) {
      expect(resolveDeliverableFulfillmentHandler(id)).not.toBeNull();
    }
  });

  it('resolves website-business to website handler', () => {
    const h = resolveDeliverableFulfillmentHandler('website-business');
    expect(h?.ids).toContain('website-business');
  });

  it('resolves audit to consulting handler', () => {
    const h = resolveDeliverableFulfillmentHandler('audit');
    expect(h?.ids).toContain('audit');
  });
});

describe('deliverable document pdf', () => {
  it('generates non-empty PDF buffer', async () => {
    const buf = await generateDeliverablePdfBuffer({
      brandName: 'Omni Group',
      title: 'Test Audit',
      clientName: 'Acme',
      deliverableName: 'Technical audit',
      sections: [{ heading: 'Summary', body: 'All checks passed.' }],
    });
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString()).toBe('%PDF');
  });
});
