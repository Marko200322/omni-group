import { resolveVerticalDeliveryPack } from '../../../../modules/autonomy-loop/lib/vertical-delivery-resolver';
import {
  renderVerticalModuleTs,
  renderVerticalPageTsx,
  renderVerticalWorkflowJson,
} from '../../../../modules/autonomy-loop/templates/vertical-templates';

describe('vertical-templates', () => {
  const vars = {
    slug: 'healthcare-dental',
    name: 'Dental (Healthcare)',
    category: 'healthcare',
    keywords: 'dental, crm, saas',
    valueProp: 'Ops panel for dental clinics',
    monthlyPriceEur: 149,
    coreModules: ['crm', 'outreach', 'billing'],
    outreachHooks: ['Automated follow-up', 'CRM pipeline'],
    recommendedDeliverables: [
      { id: 'vertical-package', nameSr: 'Vertikalni paket', clientPriceEur: 149, billing: 'monthly' },
    ],
  };

  it('renders module ts with slug export', () => {
    const out = renderVerticalModuleTs(vars);
    expect(out).toContain("verticalSlug = 'healthcare-dental'");
    expect(out).toContain('HealthcareDentalVertical');
    expect(out).toContain('coreModules');
  });

  it('renders page tsx with CTA and dynamic deliverable pricing', () => {
    const out = renderVerticalPageTsx(vars);
    expect(out).toContain('Dental (Healthcare)');
    expect(out).toContain('contact?service=vertical-package');
    expect(out).toContain('vertical=healthcare-dental');
    expect(out).toContain('od €');
    expect(out).toContain('Preporučene isporuke');
  });

  it('renders workflow json from delivery pack', () => {
    const pack = resolveVerticalDeliveryPack({
      slug: 'healthcare-dental',
      category: 'healthcare',
      name: 'Dental (Healthcare)',
    });
    const out = renderVerticalWorkflowJson(pack);
    const parsed = JSON.parse(out) as { verticalSlug: string; steps: unknown[] };
    expect(parsed.verticalSlug).toBe('healthcare-dental');
    expect(parsed.steps.length).toBeGreaterThan(0);
  });
});
