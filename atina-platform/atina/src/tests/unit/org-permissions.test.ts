import { hasOrgPermission, permissionsForOrgRole } from '../../modules/auth/lib/org-permissions';

describe('org permissions', () => {
  it('gives owners every permission', () => {
    expect(permissionsForOrgRole('owner')).toContain('members.manage');
    expect(permissionsForOrgRole('owner')).toContain('billing.manage');
  });

  it('blocks viewers from writing CRM or managing billing', () => {
    expect(
      hasOrgPermission({ permission: 'crm.write', orgRole: 'viewer' }),
    ).toBe(false);
    expect(
      hasOrgPermission({ permission: 'billing.manage', orgRole: 'viewer' }),
    ).toBe(false);
    expect(
      hasOrgPermission({ permission: 'crm.read', orgRole: 'viewer' }),
    ).toBe(true);
  });

  it('lets platform admins bypass workspace role', () => {
    expect(
      hasOrgPermission({
        permission: 'members.manage',
        orgRole: 'viewer',
        platformRole: 'admin',
      }),
    ).toBe(true);
  });

  it('lets members read billing but not manage it', () => {
    expect(hasOrgPermission({ permission: 'billing.read', orgRole: 'member' })).toBe(true);
    expect(hasOrgPermission({ permission: 'billing.manage', orgRole: 'member' })).toBe(false);
    expect(hasOrgPermission({ permission: 'support.use', orgRole: 'viewer' })).toBe(false);
  });

  it('honors explicit overrides over the role map', () => {
    expect(
      hasOrgPermission({
        permission: 'billing.manage',
        orgRole: 'viewer',
        overrides: ['billing.manage'],
      }),
    ).toBe(true);
  });
});
