import { isCompanyEmail, isBlockedOrgDomain } from '../../modules/client-hunter/lib/company-email';

describe('company-email', () => {
  it('accepts company domains', () => {
    expect(isCompanyEmail('anna@acme-software.de')).toBe(true);
    expect(isCompanyEmail('sales@studio.io')).toBe(true);
  });

  it('rejects free-mail and government', () => {
    expect(isCompanyEmail('max@gmail.com')).toBe(false);
    expect(isCompanyEmail('max.meyer@arbeitsagentur.de')).toBe(false);
    expect(isCompanyEmail('smoke@omnigroup.local')).toBe(false);
  });

  it('blocks org domains used as enrich hosts', () => {
    expect(isBlockedOrgDomain('arbeitsagentur.de')).toBe(true);
    expect(isBlockedOrgDomain('francetravail.fr')).toBe(true);
    expect(isBlockedOrgDomain('acme.de')).toBe(false);
  });
});
