/** Omni Group brand + three product modules (they do not replace the brand name). */
export const BRAND_NAME = 'Omni Group';

export const MODULES = [
  {
    id: 'atina',
    name: 'Atina',
    tagline: 'API & SaaS core',
    description: 'Auth, billing, health, public plan catalog — Express/Node monorepo.',
    color: 'violet',
    href: '/admin#system',
  },
  {
    id: 'astra',
    name: 'Astra',
    tagline: 'Automation & workflows',
    description: 'Chain templates, Forge pipelines, execution stats, and observability.',
    color: 'cyan',
    href: '/dashboard#automations',
  },
  {
    id: 'titan',
    name: 'Titan',
    tagline: 'Operations & integrations',
    description: 'Aggregators, queues, backups, admin gates, and production ops.',
    color: 'emerald',
    href: '/admin#workflows',
  },
] as const;
