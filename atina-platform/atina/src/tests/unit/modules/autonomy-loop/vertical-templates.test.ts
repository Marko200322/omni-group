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
  };

  it('renders module ts with slug export', () => {
    const out = renderVerticalModuleTs(vars);
    expect(out).toContain("verticalSlug = 'healthcare-dental'");
    expect(out).toContain('HealthcareDentalVertical');
  });

  it('renders page tsx with CTA', () => {
    const out = renderVerticalPageTsx(vars);
    expect(out).toContain('Dental (Healthcare)');
    expect(out).toContain('vertical=healthcare-dental');
  });

  it('renders workflow json', () => {
    const out = renderVerticalWorkflowJson(vars);
    const parsed = JSON.parse(out) as { verticalSlug: string };
    expect(parsed.verticalSlug).toBe('healthcare-dental');
  });
});
