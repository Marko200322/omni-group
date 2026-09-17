const ADMIN_ROLES = new Set(['admin', 'superadmin', 'operator', 'owner']);

export function isAdminRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return ADMIN_ROLES.has(role.trim().toLowerCase());
}
