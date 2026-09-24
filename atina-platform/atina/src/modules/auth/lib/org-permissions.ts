export const ORG_ROLES = ['owner', 'admin', 'operator', 'member', 'viewer'] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const PERMISSIONS = [
  'crm.read',
  'crm.write',
  'billing.read',
  'billing.manage',
  'members.read',
  'members.manage',
  'documents.read',
  'documents.write',
  'support.use',
  'settings.manage',
] as const;

export type OrgPermission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<OrgRole, readonly OrgPermission[]> = {
  owner: PERMISSIONS,
  admin: [
    'crm.read',
    'crm.write',
    'billing.read',
    'billing.manage',
    'members.read',
    'members.manage',
    'documents.read',
    'documents.write',
    'support.use',
    'settings.manage',
  ],
  operator: [
    'crm.read',
    'crm.write',
    'billing.read',
    'documents.read',
    'documents.write',
    'support.use',
  ],
  member: ['crm.read', 'billing.read', 'documents.read', 'documents.write', 'support.use'],
  viewer: ['crm.read', 'billing.read', 'documents.read'],
};

const PLATFORM_ADMIN_ROLES = new Set(['admin', 'superadmin', 'owner', 'operator']);

export function isOrgRole(value: string | null | undefined): value is OrgRole {
  return Boolean(value && (ORG_ROLES as readonly string[]).includes(value));
}

export function normalizeOrgRole(value: string | null | undefined): OrgRole {
  return isOrgRole(value) ? value : 'member';
}

export function permissionsForOrgRole(role: string | null | undefined): OrgPermission[] {
  return [...ROLE_PERMISSIONS[normalizeOrgRole(role)]];
}

export function hasOrgPermission(input: {
  permission: OrgPermission;
  orgRole?: string | null;
  platformRole?: string | null;
  overrides?: string[] | null;
}): boolean {
  if (input.platformRole && PLATFORM_ADMIN_ROLES.has(input.platformRole.trim().toLowerCase())) {
    return true;
  }
  if (input.overrides && input.overrides.length > 0) {
    return input.overrides.includes(input.permission);
  }
  return permissionsForOrgRole(input.orgRole).includes(input.permission);
}
