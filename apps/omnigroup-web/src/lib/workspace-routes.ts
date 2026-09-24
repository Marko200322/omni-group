import type { LucideIcon } from 'lucide-react';
import { hasOrgPermission, type OrgPermission } from './org-permissions';
import {
  Activity,
  Bot,
  CreditCard,
  Crosshair,
  Factory,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  UserCircle,
  Users,
  Workflow,
} from 'lucide-react';
export type WorkspaceNavItem = { href: string; label: string; icon: LucideIcon };

export const CLIENT_WORKSPACE_SECTIONS = [
  'overview',
  'orders',
  'deliveries',
  'projects',
  'quote',
  'billing',
  'documents',
  'support',
  'consultation',
  'account',
] as const;

export type ClientWorkspaceSection = (typeof CLIENT_WORKSPACE_SECTIONS)[number];

export const ADMIN_WORKSPACE_SECTIONS = [
  'overview',
  'customers',
  'billing',
  'factory',
  'hunting',
  'resources',
  'autonomy',
  'system',
  'settings',
  'workflows',
] as const;

export type AdminWorkspaceSection = (typeof ADMIN_WORKSPACE_SECTIONS)[number];

export const CLIENT_SECTION_META: Record<
  ClientWorkspaceSection,
  { href: string; label: string; title: string; subtitle: string; icon: LucideIcon }
> = {
  overview: {
    href: '/dashboard',
    label: 'Overview',
    title: 'Workspace',
    subtitle: 'Track orders, deliveries, billing, and support in one place.',
    icon: LayoutDashboard,
  },
  orders: {
    href: '/dashboard/orders',
    label: 'Orders',
    title: 'Your orders',
    subtitle: 'Status of your custom software requests.',
    icon: Package,
  },
  deliveries: {
    href: '/dashboard/deliveries',
    label: 'Deliveries',
    title: 'Your deliveries',
    subtitle: 'Documents, live sites, and builds ready after payment.',
    icon: Truck,
  },
  projects: {
    href: '/dashboard/projects',
    label: 'Projects',
    title: 'Project status',
    subtitle: 'Active work and delivery progress.',
    icon: FolderKanban,
  },
  quote: {
    href: '/dashboard/order',
    label: 'New order',
    title: 'New order',
    subtitle: 'Choose a deliverable and send it to checkout.',
    icon: CreditCard,
  },
  billing: {
    href: '/dashboard/billing',
    label: 'Billing',
    title: 'Billing & payments',
    subtitle: 'Plans, invoices, and payment history.',
    icon: CreditCard,
  },
  documents: {
    href: '/dashboard/documents',
    label: 'Documents',
    title: 'Documents',
    subtitle: 'Upload briefs, contracts, or reference files.',
    icon: FileText,
  },
  support: {
    href: '/dashboard/support',
    label: 'Support',
    title: 'Support',
    subtitle: 'Omi or a live call with our team.',
    icon: LifeBuoy,
  },
  consultation: {
    href: '/dashboard/consultation',
    label: 'Consultations',
    title: 'Consultations',
    subtitle: 'Scope, timelines, and the right delivery package.',
    icon: MessageCircle,
  },
  account: {
    href: '/dashboard/account',
    label: 'Account',
    title: 'Your account',
    subtitle: 'Profile, plan, and workspace details.',
    icon: UserCircle,
  },
};

export const ADMIN_SECTION_META: Record<
  AdminWorkspaceSection,
  { href: string; label: string; title: string; subtitle: string; icon: LucideIcon }
> = {
  overview: {
    href: '/admin',
    label: 'Overview',
    title: 'Operator overview',
    subtitle: 'Live operator data, factory phase, and system health.',
    icon: LayoutDashboard,
  },
  customers: {
    href: '/admin/customers',
    label: 'Customers',
    title: 'Customers & tenants',
    subtitle: 'Invites, plan assignments, and CRM contacts.',
    icon: Users,
  },
  billing: {
    href: '/admin/billing',
    label: 'Billing',
    title: 'Billing & fulfillment',
    subtitle: 'Pending payments, revenue, and plan catalog.',
    icon: CreditCard,
  },
  factory: {
    href: '/admin/factory',
    label: 'Product Factory',
    title: 'Product Factory',
    subtitle: 'Client orders and internal SaaS lane.',
    icon: Factory,
  },
  hunting: {
    href: '/admin/hunting',
    label: 'Hunting',
    title: 'Hunting',
    subtitle: 'Client Hunter, outreach drafts, and pipeline.',
    icon: Crosshair,
  },
  resources: {
    href: '/admin/resources',
    label: 'Resources',
    title: 'Resource shop',
    subtitle: 'Buy API credits through the operator console.',
    icon: ShoppingCart,
  },
  autonomy: {
    href: '/admin/autonomy',
    label: 'Autonomy Loop',
    title: 'Autonomy Loop',
    subtitle: 'Scheduler, outbound stats, and vertical rollout.',
    icon: Bot,
  },
  system: {
    href: '/admin/system',
    label: 'System',
    title: 'System',
    subtitle: 'Atina API snapshot and live operator feed.',
    icon: Activity,
  },
  settings: {
    href: '/admin/settings',
    label: 'Settings',
    title: 'Settings',
    subtitle: 'Operator links and AI memory.',
    icon: Settings,
  },
  workflows: {
    href: '/admin/workflows',
    label: 'Workflows',
    title: 'Workflows',
    subtitle: 'Registered Atina modules and health probes.',
    icon: Workflow,
  },
};

const CLIENT_HASH_REDIRECTS: Record<string, string> = {
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

const ADMIN_HASH_REDIRECTS: Record<string, string> = {
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

const CLIENT_SECTION_PERMISSION: Partial<Record<ClientWorkspaceSection, OrgPermission>> = {
  billing: 'billing.read',
  quote: 'billing.manage',
  documents: 'documents.read',
  support: 'support.use',
};

export function buildClientNavItems(
  user?: { orgRole?: string | null; role?: string | null } | null,
): WorkspaceNavItem[] {
  return CLIENT_WORKSPACE_SECTIONS.filter((section) => {
    const permission = CLIENT_SECTION_PERMISSION[section];
    if (!permission || !user) return true;
    return hasOrgPermission(user.orgRole ?? 'owner', permission, user.role);
  }).map((section) => {
    const meta = CLIENT_SECTION_META[section];
    return { href: meta.href, label: meta.label, icon: meta.icon };
  });
}

export function resolveWorkspaceHashRedirect(pathname: string, hash: string): string | null {
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

export function isPlatformNavActive(pathname: string, href: string): boolean {
  const path = href.split('#')[0] ?? href;
  if (path === '/dashboard' || path === '/admin') return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}
