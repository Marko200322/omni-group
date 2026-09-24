/** Omni Group Tech brand + three product modules (they do not replace the brand name). */
export const BRAND_NAME = 'Omni Group Tech';

/** Public/portal chat assistant display name (not the Atina API module). */
export const ASSISTANT_NAME = 'Omi';

export const MODULES = [
  {
    id: 'atina',
    name: 'Atina',
    tagline: 'Workspace & billing',
    description: 'CRM, plans, invoices, and the client portal in one subscription.',
    color: 'violet',
    href: '/products',
  },
  {
    id: 'astra',
    name: 'Astra',
    tagline: 'Automation & delivery',
    description: 'Workflows that keep sales, fulfillment, and follow-up in the same process.',
    color: 'cyan',
    href: '/products',
  },
  {
    id: 'titan',
    name: 'Titan',
    tagline: 'Operations & support',
    description: 'Integrations, delivery status, and support that stay tied to the account.',
    color: 'emerald',
    href: '/login',
  },
] as const;
