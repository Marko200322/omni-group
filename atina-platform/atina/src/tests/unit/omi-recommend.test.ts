import {
  formatOmiAdvisorReply,
  recommendOmiProducts,
  searchOmiProducts,
} from '../../modules/omi/omi-recommend';

describe('OMI catalog recommendation', () => {
  it('maps a restaurant budget case to verified local-service SKUs under budget', () => {
    const result = recommendOmiProducts({
      message:
        'I own a small restaurant. We receive many repetitive questions, lose leads and do not have a proper digital system. I have €2000.',
    });
    expect(result.noSuitable).toBe(false);
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.products.every((p) => p.billing === 'monthly' || p.priceEur <= 2000)).toBe(true);
    expect(result.products.some((p) => p.id === 'landing' || p.id === 'setup-quick')).toBe(true);
    expect(result.products.every((p) => p.id !== 'website-ecommerce')).toBe(true);
  });

  it('does not recommend lead-gen or ecommerce for healthcare', () => {
    const result = recommendOmiProducts({
      message: 'We run a hospice and need a safer operations record.',
      industryCategory: 'healthcare',
    });
    expect(result.products.map((p) => p.id)).not.toContain('lead-gen-retainer');
    expect(result.products.map((p) => p.id)).not.toContain('website-ecommerce');
    expect(result.products.some((p) => p.id === 'audit')).toBe(true);
  });

  it('says no suitable product when Omni has no matching SKU', () => {
    const result = recommendOmiProducts({
      message: 'I need a licensed nuclear reactor control system with radiation hardware.',
    });
    expect(result.noSuitable).toBe(true);
    expect(result.products).toEqual([]);
    expect(searchOmiProducts('nuclear reactor radiation hardware')).toEqual([]);
    expect(formatOmiAdvisorReply(result)).toMatch(/does not currently have a verified solution/i);
  });

  it('writes an advisor reply that cites verified prices and next step', () => {
    const result = recommendOmiProducts({
      message:
        'I own a small restaurant. We receive many repetitive questions, lose leads and do not have a proper digital system. I have €2000.',
    });
    const reply = formatOmiAdvisorReply(result);
    expect(reply).toMatch(/What I understand/);
    expect(reply).toMatch(/bottleneck|Problems I identified|repetitive/i);
    expect(reply).toMatch(/€\d+/);
    expect(reply).toMatch(/\/products|\/contact/);
    expect(reply).not.toMatch(/discount|guarantee|unlimited/i);
  });

  it('only returns catalog ids that exist', () => {
    const result = recommendOmiProducts({ message: 'landing page and portal setup' });
    expect(result.products.every((p) => /^[a-z0-9-]+$/.test(p.id) && p.priceEur > 0)).toBe(true);
  });

  it('on /pricing page-buy questions leads with SaaS and does not dump expert SKUs', () => {
    const result = recommendOmiProducts({
      message: 'What am I buying on this page?',
      pagePath: '/pricing',
    });
    expect(result.saasFocus).toBe(true);
    expect(result.noSuitable).toBe(false);
    expect(result.products).toEqual([]);
    expect(result.saas.map((s) => s.name)).toEqual(['Launch', 'Growth', 'Scale']);
    const reply = formatOmiAdvisorReply(result);
    expect(reply).toMatch(/Launch €79\/\$89/);
    expect(reply).toMatch(/Growth €249\/\$279/);
    expect(reply).toMatch(/Scale €429\/\$469/);
    expect(reply).not.toMatch(/website-business|setup-quick|white-label/i);
  });

  it('does not treat "this page" as a missing-website problem', () => {
    const result = recommendOmiProducts({
      message: 'What am I buying on this page?',
      pagePath: '/pricing',
    });
    expect(result.problems).toEqual([]);
  });

  it('on /products without a selected SKU does not pick a random package', () => {
    const result = recommendOmiProducts({
      message: 'What is included in this package?',
      pagePath: '/products',
    });
    expect(result.catalogFocus).toBe(true);
    expect(result.products).toEqual([]);
    expect(formatOmiAdvisorReply(result)).toMatch(/Open a package card or name the SKU/);
    expect(formatOmiAdvisorReply(result)).not.toMatch(/setup-quick|website-business/);
  });
});
