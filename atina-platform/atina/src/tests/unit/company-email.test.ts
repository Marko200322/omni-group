import { isCompanyEmail, isBlockedOrgDomain, isExcludedHuntPlatformKind, passesHotClientPersistGate } from '../../modules/client-hunter/lib/company-email';

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

  it('excludes government platform kinds from hot client persist', () => {
    expect(isExcludedHuntPlatformKind('government')).toBe(true);
    expect(isExcludedHuntPlatformKind('job_board')).toBe(false);
    expect(
      passesHotClientPersistGate({ platformKind: 'government' }, { excludePlatformKinds: ['government'] }),
    ).toBe(false);
    expect(
      passesHotClientPersistGate(
        { platformKind: 'job_board', contactEmail: 'max@gmail.com' },
        { companyEmailsOnly: true },
      ),
    ).toBe(false);
    expect(
      passesHotClientPersistGate(
        { platformKind: 'job_board', contactEmail: 'sales@acme.de' },
        { companyEmailsOnly: true },
      ),
    ).toBe(true);
    expect(passesHotClientPersistGate({ platformKind: 'job_board', hasEmail: true }, { companyEmailsOnly: true })).toBe(
      false,
    );
  });
});
