import { DELIVERABLE_CATALOG, getDeliverable } from '../../modules/billing/lib/deliverable-catalog';
import { getPackageDeliverySpec } from '../../modules/billing/lib/package-delivery-spec';

/** SKUs that must sell as SERVICE + DOCS — never PDF-only theater. */
const SERVICE_DOCS_IDS = [
  'audit',
  'workflow-design',
  'sales-enablement',
  'integration',
  'bundle-ops-clarity',
] as const;

/** SKUs that must keep PRODUCT/OPS language. */
const PRODUCT_OPS_IDS = ['setup-quick', 'landing', 'website-ecommerce', 'lead-gen-retainer'] as const;

describe('catalog document vs product honesty', () => {
  it.each(SERVICE_DOCS_IDS)('%s is labeled SERVICE + DOCS, not PDF-only', (id) => {
    const spec = getPackageDeliverySpec(id);
    const catalog = getDeliverable(id) ?? DELIVERABLE_CATALOG.find((d) => d.id === id);
    expect(spec).toBeTruthy();
    expect(catalog).toBeTruthy();
    const blob = `${spec!.description}\n${catalog!.description}\n${spec!.includes.join('\n')}`;
    expect(blob).toMatch(/SERVICE\s*\+\s*DOCS/i);
    expect(blob.toLowerCase()).toMatch(/invoice|kickoff|workspace|commercial/);
    expect(blob.toLowerCase()).not.toMatch(/pdf-only theater|document \/ consulting deliverable/);
  });

  it.each(PRODUCT_OPS_IDS)('%s keeps PRODUCT/OPS language (not document-primary)', (id) => {
    const spec = getPackageDeliverySpec(id);
    expect(spec).toBeTruthy();
    if (id === 'setup-quick') {
      expect(spec!.description).toMatch(/PRODUCT\/OPS/i);
      expect(spec!.includes.some((i) => /CRM view/i.test(i))).toBe(true);
      expect(spec!.includes.some((i) => /onboarding tasks/i.test(i))).toBe(true);
      expect(spec!.excludes.some((e) => /automations CONNECTED/i.test(e))).toBe(true);
      expect(spec!.description).not.toMatch(/^DOCUMENT\s*\/\s*consulting/i);
    } else {
      expect(spec!.description).not.toMatch(/DOCUMENT\s*\/\s*consulting deliverable/i);
    }
  });

  it('setup-quick description mentions CRM view and NOT CONNECTED automations', () => {
    const setup = getPackageDeliverySpec('setup-quick')!;
    expect(setup.description).toMatch(/CRM view/i);
    expect(setup.description).toMatch(/NOT CONNECTED/i);
    expect(setup.excludes.some((e) => /External automations CONNECTED/i.test(e))).toBe(true);
  });
});
