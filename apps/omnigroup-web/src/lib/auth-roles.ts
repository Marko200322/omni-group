export function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'superadmin' || role === 'operator';
}
