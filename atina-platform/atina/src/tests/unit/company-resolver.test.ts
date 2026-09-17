import { buildCompanyIdentityHash, normalizeDomain, resolveCanonicalName } from '../../modules/problem-hunter/lib/company-resolver';

describe('company-resolver', () => {
  it('normalizes domain from URL', () => {
    expect(normalizeDomain('https://www.acme.com/path')).toBe('acme.com');
  });

  it('same company gets same identity hash', () => {
    const a = buildCompanyIdentityHash({ companyName: 'Acme', domain: 'acme.com' });
    const b = buildCompanyIdentityHash({ companyName: 'acme', website: 'https://www.acme.com' });
    expect(a).toBe(b);
  });

  it('resolves canonical name', () => {
    expect(resolveCanonicalName({ companyName: '  Acme  ' })).toBe('Acme');
    expect(resolveCanonicalName({ domain: 'acme.com' })).toBe('acme.com');
  });
});
