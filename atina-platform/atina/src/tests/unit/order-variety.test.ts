import { DeliverableDocumentGeneratorService } from '../../modules/billing/service/deliverable-document-generator.service';
import { DeliverableContentGeneratorService } from '../../modules/billing/service/deliverable-content-generator.service';
import {
  buildOrderIdentity,
  contentFingerprint,
  docBodyBlob,
} from '../../modules/billing/lib/order-identity';
import { mergeHintsIntoPayload } from '../../modules/billing/lib/fulfillment-generation-hints';

jest.mock('../../integrations', () => ({
  getAiClient: () => ({ isConfigured: () => false }),
}));

describe('per-order deliverable variety', () => {
  const docs = new DeliverableDocumentGeneratorService();
  const sites = new DeliverableContentGeneratorService();

  it('embeds distinct order refs for two payments of the same SKU/client', async () => {
    const a = buildOrderIdentity('pay-aaaaaaaa-1111', 'job-aaaa');
    const b = buildOrderIdentity('pay-bbbbbbbb-2222', 'job-bbbb');
    expect(a.shortRef).not.toBe(b.shortRef);

    const docA = await docs.generateAuditReport({
      clientName: 'North Peak Studio',
      industryCategory: 'fitness',
      generationHints: { orderIdentity: a },
    });
    const docB = await docs.generateAuditReport({
      clientName: 'North Peak Studio',
      industryCategory: 'fitness',
      generationHints: { orderIdentity: b },
    });

    const blobA = docBodyBlob(docA);
    const blobB = docBodyBlob(docB);
    expect(blobA).toContain(a.shortRef);
    expect(blobB).toContain(b.shortRef);
    expect(blobA).not.toContain(b.shortRef);
    expect(blobB).not.toContain(a.shortRef);
    expect(contentFingerprint(blobA)).not.toBe(contentFingerprint(blobB));
  });

  it('differs by client brand and industry, not only order ref', async () => {
    const order = buildOrderIdentity('pay-cccc-3333', 'job-cccc');
    const fitness = await docs.generateAuditReport({
      clientName: 'Peak Fitness Co',
      industryCategory: 'fitness',
      generationHints: { orderIdentity: order },
    });
    const legal = await docs.generateAuditReport({
      clientName: 'Harbor Legal LLP',
      industryCategory: 'legal',
      generationHints: { orderIdentity: order },
    });
    const fBlob = docBodyBlob(fitness);
    const lBlob = docBodyBlob(legal);
    expect(fBlob).toMatch(/Peak Fitness Co/);
    expect(lBlob).toMatch(/Harbor Legal LLP/);
    expect(fBlob).not.toEqual(lBlob);
    expect(contentFingerprint(fBlob)).not.toBe(contentFingerprint(lBlob));
  });

  it('stamps website home pages with order identity', async () => {
    const order = buildOrderIdentity('pay-site-4444', 'job-site');
    const pages = await sites.generateWebsitePages({
      deliverableId: 'website-business',
      title: 'River Clinic',
      clientName: 'River Clinic',
      industryCategory: 'healthcare',
      generationHints: { orderIdentity: order },
    });
    const home = pages.find((p) => p.kind === 'home' || p.slug === 'home');
    expect(home?.body).toContain(order.shortRef);
    expect(home?.body).toMatch(/River Clinic/);
  });

  it('mergeHintsIntoPayload requires uniqueness when orderIdentity is set', () => {
    const order = buildOrderIdentity('pay-hint-5555', 'job-hint');
    const out = mergeHintsIntoPayload({ clientName: 'Acme' }, { orderIdentity: order });
    expect(out.orderMustBeUnique).toBe(true);
    expect(String(out.instruction)).toContain(order.shortRef);
  });
});
