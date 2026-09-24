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
  admin: PERMISSIONS,
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

export function normalizeOrgRole(value: string | null | undefined): OrgRole {
  return value && (ORG_ROLES as readonly string[]).includes(value) ? (value as OrgRole) : 'member';
}

export function hasOrgPermission(
  orgRole: string | null | undefined,
  permission: OrgPermission,
  platformRole?: string | null,
): boolean {
  const platform = platformRole?.trim().toLowerCase();
  if (platform && ['admin', 'superadmin', 'owner', 'operator'].includes(platform)) return true;
  return ROLE_PERMISSIONS[normalizeOrgRole(orgRole)].includes(permission);
}

/** Missing orgRole on an older session is treated as the workspace creator. */
export function sessionHasOrgPermission(
  user: { orgRole?: string | null; role?: string | null } | null | undefined,
  permission: OrgPermission,
): boolean {
  if (!user) return false;
  return hasOrgPermission(user.orgRole ?? 'owner', permission, user.role);
}
