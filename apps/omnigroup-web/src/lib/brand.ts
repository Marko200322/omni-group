/** Omni Group brend + tri produkt modula (ne zamenjuju ime brenda). */
export const BRAND_NAME = 'Omni Group';

export const MODULES = [
  {
    id: 'atina',
    name: 'Atina',
    tagline: 'API & SaaS jezgro',
    description: 'Auth, billing, health, javni katalog planova — Express/Node monorepo.',
    color: 'violet',
    href: '/admin#system',
  },
  {
    id: 'astra',
    name: 'Astra',
    tagline: 'Automatizacija & workflow',
    description: 'Chain template-i, Forge pipeline-i, execution stats i observability.',
    color: 'cyan',
    href: '/dashboard#automations',
  },
  {
    id: 'titan',
    name: 'Titan',
    tagline: 'Operacije & integracije',
    description: 'Agregatori, queue-ovi, backup, admin gate-ovi i production ops.',
    color: 'emerald',
    href: '/admin#workflows',
  },
] as const;
