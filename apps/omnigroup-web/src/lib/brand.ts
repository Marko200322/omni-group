/** Omni Group Tech brand + three product modules (they do not replace the brand name). */
export const BRAND_NAME = 'Omni Group Tech';

/** Public/portal chat assistant display name (not the Atina API module). */
export const ASSISTANT_NAME = 'Omi';

export const MODULES = [
  {
    id: 'atina',
    name: 'Atina',
    tagline: 'API & SaaS core',
    description: 'Auth, billing, health, public plan catalog — Express/Node monorepo.',
    color: 'violet',
    href: '/services',
  },
  {
    id: 'astra',
    name: 'Astra',
    tagline: 'Automation & workflows',
    description: 'Chain templates, Forge pipelines, execution stats, and observability.',
    color: 'cyan',
    href: '/products',
  },
  {
    id: 'titan',
    name: 'Titan',
    tagline: 'Operations & integrations',
    description: 'Aggregators, queues, backups, admin gates, and production ops.',
    color: 'emerald',
    href: '/products',
  },
] as const;
