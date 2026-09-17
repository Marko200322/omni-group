import type { LucideIcon } from 'lucide-react';
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
  Briefcase,
} from 'lucide-react';

export type PlatformNavItem = { href: string; label: string; icon: LucideIcon };

export type AdminNavOptions = {
  leanProd: boolean;
  hunterAllowed: boolean;
  autonomyAllowed: boolean;
};

/** Admin sidebar items — only links to sections that exist for the current factory phase / prod mode. */
export function buildAdminNavItems(options: AdminNavOptions): PlatformNavItem[] {
  const { leanProd, hunterAllowed, autonomyAllowed } = options;

  const items: PlatformNavItem[] = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard', label: 'Client portal', icon: FolderKanban },
    { href: '/admin#factory', label: 'Product Factory', icon: Factory },
  ];

  if (hunterAllowed) {
    items.push({ href: '/admin#hunting', label: 'Hunting', icon: Crosshair });
  }
  if (hunterAllowed && !leanProd) {
    items.push({ href: '/admin#resources', label: 'Resources', icon: ShoppingCart });
  }
  if (autonomyAllowed) {
    items.push({ href: '/admin#autonomy', label: 'Autonomy Loop', icon: Bot });
  }

  items.push(
    { href: '/admin#workflows', label: 'Workflows', icon: Workflow },
    { href: '/admin#invite-users', label: 'Invite client', icon: Users },
    { href: '/admin#crm', label: 'CRM', icon: Briefcase },
    { href: '/admin#billing', label: 'Billing', icon: CreditCard },
    { href: '/admin#system', label: 'System', icon: Activity },
    { href: '/admin#settings', label: 'Settings', icon: Settings },
  );

  return items;
}
