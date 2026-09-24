/**
 * Lightweight check for workspace hash redirects and nav active matching.
 * Run: node scripts/test-workspace-routes.mjs
 */

const CLIENT_HASH_REDIRECTS = {
  orders: '/dashboard/orders',
  deliveries: '/dashboard/deliveries',
  projects: '/dashboard/projects',
  automations: '/dashboard/projects',
  quote: '/dashboard/order',
  billing: '/dashboard/billing',
  documents: '/dashboard/documents',
  support: '/dashboard/support',
  consultation: '/dashboard/consultation',
  sales: '/dashboard/consultation',
  account: '/dashboard/account',
};

const ADMIN_HASH_REDIRECTS = {
  factory: '/admin/factory',
  hunting: '/admin/hunting',
  resources: '/admin/resources',
  autonomy: '/admin/autonomy',
  'invite-users': '/admin/customers',
  users: '/admin/customers',
  'enterprise-controls': '/admin/customers',
  crm: '/admin/customers',
  billing: '/admin/billing',
  system: '/admin/system',
  settings: '/admin/settings',
  workflows: '/admin/workflows',
};

function resolveWorkspaceHashRedirect(pathname, hash) {
  const fragment = hash.replace(/^#/, '').trim();
  if (!fragment) return null;
  if (pathname === '/dashboard' || pathname === '/dashboard/') {
    return CLIENT_HASH_REDIRECTS[fragment] ?? null;
  }
  if (pathname === '/admin' || pathname === '/admin/') {
    return ADMIN_HASH_REDIRECTS[fragment] ?? null;
  }
  return null;
}

function isPlatformNavActive(pathname, href) {
  const path = href.split('#')[0] ?? href;
  if (path === '/dashboard' || path === '/admin') return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

const cases = [
  ['/dashboard', '#billing', '/dashboard/billing'],
  ['/dashboard', '#quote', '/dashboard/order'],
  ['/dashboard/', 'orders', '/dashboard/orders'],
  ['/admin', '#crm', '/admin/customers'],
  ['/admin', '#enterprise-controls', '/admin/customers'],
  ['/admin', '#factory', '/admin/factory'],
  ['/dashboard/billing', '#billing', null],
  ['/dashboard', '#', null],
];

for (const [pathname, hash, expected] of cases) {
  const got = resolveWorkspaceHashRedirect(pathname, hash);
  if (got !== expected) {
    throw new Error(`redirect ${pathname}${hash} expected ${expected}, got ${got}`);
  }
}

if (!isPlatformNavActive('/dashboard', '/dashboard')) throw new Error('overview should be active');
if (isPlatformNavActive('/dashboard/billing', '/dashboard')) throw new Error('overview should not match billing');
if (!isPlatformNavActive('/dashboard/billing', '/dashboard/billing')) throw new Error('billing should be active');
if (!isPlatformNavActive('/dashboard/billing/success', '/dashboard/billing')) {
  throw new Error('billing success should keep billing nav active');
}
if (isPlatformNavActive('/admin/customers', '/admin')) throw new Error('admin overview should stay exact');
if (!isPlatformNavActive('/admin/customers', '/admin/customers')) throw new Error('customers should be active');

console.log('test-workspace-routes: ok');
