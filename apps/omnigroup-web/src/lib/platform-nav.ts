import {
  LayoutDashboard,
  Users,
  CreditCard,
  Workflow,
  Settings,
  FolderKanban,
  Bot,
  Factory,
  ShoppingCart,
  Activity,
  Crosshair,
} from 'lucide-react';
import {
  ADMIN_SECTION_META,
  buildClientNavItems,
  type WorkspaceNavItem,
} from './workspace-routes';

export type PlatformNavItem = WorkspaceNavItem;

export type AdminNavOptions = {
  leanProd: boolean;
  hunterAllowed: boolean;
  autonomyAllowed: boolean;
};

export { buildClientNavItems };

/** Admin sidebar items — only links to sections that exist for the current factory phase / prod mode. */
export function buildAdminNavItems(options: AdminNavOptions): PlatformNavItem[] {
  const { leanProd, hunterAllowed, autonomyAllowed } = options;

  const items: PlatformNavItem[] = [
    { href: ADMIN_SECTION_META.overview.href, label: ADMIN_SECTION_META.overview.label, icon: LayoutDashboard },
    { href: '/dashboard', label: 'Client portal', icon: FolderKanban },
    { href: ADMIN_SECTION_META.factory.href, label: ADMIN_SECTION_META.factory.label, icon: Factory },
  ];

  if (hunterAllowed) {
    items.push({ href: ADMIN_SECTION_META.hunting.href, label: ADMIN_SECTION_META.hunting.label, icon: Crosshair });
  }
  if (hunterAllowed && !leanProd) {
    items.push({ href: ADMIN_SECTION_META.resources.href, label: ADMIN_SECTION_META.resources.label, icon: ShoppingCart });
  }
  if (autonomyAllowed) {
    items.push({ href: ADMIN_SECTION_META.autonomy.href, label: ADMIN_SECTION_META.autonomy.label, icon: Bot });
  }

  items.push(
    { href: ADMIN_SECTION_META.customers.href, label: ADMIN_SECTION_META.customers.label, icon: Users },
    { href: ADMIN_SECTION_META.billing.href, label: ADMIN_SECTION_META.billing.label, icon: CreditCard },
    { href: ADMIN_SECTION_META.system.href, label: ADMIN_SECTION_META.system.label, icon: Activity },
    { href: ADMIN_SECTION_META.settings.href, label: ADMIN_SECTION_META.settings.label, icon: Settings },
    { href: ADMIN_SECTION_META.workflows.href, label: ADMIN_SECTION_META.workflows.label, icon: Workflow },
  );

  return items;
}
