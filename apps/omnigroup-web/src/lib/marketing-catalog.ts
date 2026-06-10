import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  Briefcase,
  Cloud,
  Cpu,
  Headphones,
  Layers,
  LineChart,
  Shield,
  Sparkles,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  formatEur,
  getModulePriceLabel,
  getPlanPriceForCategory,
  type PlanSlug,
} from './category-pricing';

export type CatalogItem = {
  id: string;
  name: string;
  description: string;
  priceLabel: string;
  priceMonthly?: number;
  priceOnce?: number;
  includedIn?: ('starter' | 'pro' | 'enterprise')[];
  href: string;
  badge?: string;
};

export type CatalogCategory = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  items: CatalogItem[];
};

/** Proizvodi — softverski moduli platforme, grupisani po poslovnoj funkciji. */
export const PRODUCT_CATEGORIES: CatalogCategory[] = [
  {
    id: 'platform',
    title: 'Platforma i nalog',
    subtitle: 'Osnova — prijava, dashboard, naplata, obaveštenja',
    icon: Layers,
    items: [
      {
        id: 'workspace',
        name: 'Klijentski workspace',
        description: 'Dashboard, projekti, nalog i live podaci sa Atina API-ja.',
        priceLabel: 'u paketu od €39/mes',
        includedIn: ['starter', 'pro', 'enterprise'],
        href: '/dashboard',
      },
      {
        id: 'billing-manual',
        name: 'Manual billing (IBAN)',
        description: 'Uputstvo za uplatu, referenca i aktivacija bez Stripe firme.',
        priceLabel: 'uključeno',
        includedIn: ['starter', 'pro', 'enterprise'],
        href: '/dashboard#billing',
      },
      {
        id: 'admin-ops',
        name: 'Operator konzola',
        description: 'Admin pregled korisnika, uplata, workflow statistike i modula.',
        priceLabel: 'od €99/mes (Rast)',
        includedIn: ['pro', 'enterprise'],
        href: '/admin',
      },
      {
        id: 'notifications',
        name: 'Obaveštenja',
        description: 'In-app i email obaveštenja za tim i klijente.',
        priceLabel: 'uključeno',
        includedIn: ['starter', 'pro', 'enterprise'],
        href: '/dashboard',
      },
    ],
  },
  {
    id: 'sales-crm',
    title: 'Prodaja i CRM',
    subtitle: 'Leads, kontakti, ugovori i prodajni avatar',
    icon: Briefcase,
    items: [
      {
        id: 'crm',
        name: 'CRM modul',
        description: 'Kontakti, pipeline i praćenje klijenata na jednom mestu.',
        priceLabel: 'od €99/mes',
        priceMonthly: 99,
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#projects',
        badge: 'Rast+',
      },
      {
        id: 'titanis',
        name: 'Titanis — prodajni motor',
        description: 'Lead generation, follow-up sekvence i zatvaranje dealova.',
        priceLabel: 'od €99/mes',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#sales',
      },
      {
        id: 'contracts',
        name: 'Ugovori',
        description: 'Kreiranje, praćenje i digitalni potpis workflow.',
        priceLabel: 'od €99/mes',
        includedIn: ['pro', 'enterprise'],
        href: '/contact',
      },
      {
        id: 'sales-avatar',
        name: 'AI prodajni avatar',
        description: '4 prodajna agenta — chat i glas za kvalifikaciju leadova.',
        priceLabel: 'od €99/mes',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#sales',
      },
    ],
  },
  {
    id: 'automation',
    title: 'Automatizacija i operacije',
    subtitle: 'Taskovi, workflow-i, scraper i izvršavanje posla',
    icon: Workflow,
    items: [
      {
        id: 'automation',
        name: 'Automatizacije',
        description: 'Workflow chain, onboarding pipeline i ponavljajući poslovi.',
        priceLabel: 'od €99/mes',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#automations',
      },
      {
        id: 'tasks',
        name: 'Task sistem',
        description: 'Red poslova, statusi i praćenje izvršenja u realnom vremenu.',
        priceLabel: 'od €99/mes',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#automations',
      },
      {
        id: 'scraper',
        name: 'Web scraper',
        description: 'Prikupljanje podataka sa weba preko Apify/Bright Data integracije.',
        priceLabel: 'od €99/mes + API troškovi',
        includedIn: ['pro', 'enterprise'],
        href: '/contact',
      },
      {
        id: 'craftor',
        name: 'Craftor',
        description: 'AI asistent za freelance platforme — predlozi, hunting, deploy.',
        priceLabel: 'od €99/mes',
        includedIn: ['pro', 'enterprise'],
        href: '/contact',
        badge: 'Pro',
      },
    ],
  },
  {
    id: 'ai-support',
    title: 'AI i klijentska podrška',
    subtitle: 'Memorija, avatari, video sastanci i RAG',
    icon: Bot,
    items: [
      {
        id: 'ai-memory',
        name: 'AI memorija',
        description: 'Dugoročni kontekst i remember/recall tok za tim.',
        priceLabel: 'od €249/mes (Partner)',
        includedIn: ['enterprise'],
        href: '/dashboard#account',
      },
      {
        id: 'support-avatar',
        name: 'AI support avatar',
        description: 'Tim avatara (Mila, Stefan, Jelena) — chat, glas, zakazivanje.',
        priceLabel: 'od €99/mes',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#support',
      },
      {
        id: 'video-meetings',
        name: 'Video sastanci',
        description: 'Zoom, Google Meet ili ručno zakazivanje support/prodaja poziva.',
        priceLabel: 'od €99/mes',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#support',
      },
      {
        id: 'ai-rag',
        name: 'AI RAG baza znanja',
        description: 'Pretraga dokumentacije i kontekst za AI odgovore.',
        priceLabel: 'od €249/mes',
        includedIn: ['enterprise'],
        href: '/contact',
      },
    ],
  },
  {
    id: 'enterprise',
    title: 'Enterprise i mediji',
    subtitle: 'White-label, compliance, video kanali i gaming pipeline',
    icon: Shield,
    items: [
      {
        id: 'white-label',
        name: 'White-label platforma',
        description: 'Tvoj brend, naš stack — za agencije i partnere.',
        priceLabel: 'od €249/mes',
        priceMonthly: 249,
        includedIn: ['enterprise'],
        href: '/contact',
      },
      {
        id: 'omnitube',
        name: 'OmniTube',
        description: 'Automatizovan pipeline za video kanale i sadržaj.',
        priceLabel: 'od €99/mes + produkcija',
        includedIn: ['pro', 'enterprise'],
        href: '/contact',
      },
      {
        id: 'omnigame',
        name: 'OmniGame',
        description: 'Validacija i pipeline za game projekte (Steam integracija).',
        priceLabel: 'od €249/mes',
        includedIn: ['enterprise'],
        href: '/contact',
      },
      {
        id: 'dominus360',
        name: 'Dominus360',
        description: 'Risk intelligence, KPI i resource management za veće timove.',
        priceLabel: 'od €249/mes',
        includedIn: ['enterprise'],
        href: '/admin',
      },
    ],
  },
];

/** Usluge — ono što tim isporučuje oko platforme (jednokratno ili retainer). */
export const SERVICE_CATEGORIES: CatalogCategory[] = [
  {
    id: 'implementation',
    title: 'Implementacija i puštanje u rad',
    subtitle: 'Od praznog repoa do prvog plaćajućeg klijenta',
    icon: Wrench,
    items: [
      {
        id: 'setup-quick',
        name: 'Brzo podešavanje',
        description: 'Env, Docker, login, manual billing, kontakt forma, smoke test.',
        priceLabel: '€290',
        priceOnce: 290,
        href: '/contact?service=setup-quick',
      },
      {
        id: 'setup-full',
        name: 'Pun onboarding',
        description: 'CRM, automatizacije, migracija podataka, obuka tima, 30 dana podrške.',
        priceLabel: '€890',
        priceOnce: 890,
        href: '/contact?service=setup-full',
        badge: 'Popularno',
      },
      {
        id: 'setup-custom',
        name: 'Custom deploy',
        description: 'Tvoj domen, SSL, backup, monitoring i SLA dogovor.',
        priceLabel: 'od €2.490',
        priceOnce: 2490,
        href: '/contact?service=setup-custom',
      },
    ],
  },
  {
    id: 'consulting',
    title: 'Savetovanje i arhitektura',
    subtitle: 'Strategija, integracije i tehnički audit',
    icon: Cpu,
    items: [
      {
        id: 'audit',
        name: 'Tehnički audit',
        description: 'Pregled stack-a, sigurnosti, env-a i plan migracije na produkciju.',
        priceLabel: '€490',
        priceOnce: 490,
        href: '/contact?service=audit',
      },
      {
        id: 'integration',
        name: 'Integracija po meri',
        description: 'Nango, OpenRouter, scraper, email — spajanje sa tvojim alatima.',
        priceLabel: 'od €790',
        priceOnce: 790,
        href: '/contact?service=integration',
      },
      {
        id: 'workflow-design',
        name: 'Dizajn workflow-a',
        description: 'Mapiranje poslovnog procesa u automatizacije i task template-e.',
        priceLabel: '€590',
        priceOnce: 590,
        href: '/contact?service=workflow-design',
      },
    ],
  },
  {
    id: 'support-retainer',
    title: 'Podrška i održavanje',
    subtitle: 'Mesečni retainer — miran san dok platforma radi',
    icon: Headphones,
    items: [
      {
        id: 'support-basic',
        name: 'Email podrška',
        description: 'Radnim danima, odgovor do 48h — uključeno u Poslovni paket.',
        priceLabel: 'uključeno u €39/mes',
        priceMonthly: 39,
        href: '/pricing',
      },
      {
        id: 'support-priority',
        name: 'Prioritetna podrška',
        description: 'Odgovor do 24h, pomoć oko env-a i manjih izmena.',
        priceLabel: '€149/mes',
        priceMonthly: 149,
        href: '/contact?service=support-priority',
      },
      {
        id: 'support-dedicated',
        name: 'Dedicated podrška',
        description: 'Slack/Viber kanal, 8h odgovor, mesečni health check.',
        priceLabel: '€390/mes',
        priceMonthly: 390,
        href: '/contact?service=support-dedicated',
        badge: 'Partner',
      },
    ],
  },
  {
    id: 'growth',
    title: 'Rast i marketing',
    subtitle: 'Pomoć oko prodaje platforme tvojim klijentima',
    icon: LineChart,
    items: [
      {
        id: 'landing',
        name: 'Landing + copy',
        description: 'Prilagođena početna stranica i tekstovi za tvoju nišu.',
        priceLabel: '€690',
        priceOnce: 690,
        href: '/contact?service=landing',
      },
      {
        id: 'white-label-setup',
        name: 'White-label pakovanje',
        description: 'Brending, domen, cenovnik i materijali za prodaju partnerima.',
        priceLabel: '€1.490',
        priceOnce: 1490,
        href: '/contact?service=white-label-setup',
      },
      {
        id: 'sales-enablement',
        name: 'Sales enablement',
        description: 'Demo skripta, FAQ, onboarding materijali za tvoj prodajni tim.',
        priceLabel: '€990',
        priceOnce: 990,
        href: '/contact?service=sales-enablement',
      },
    ],
  },
];

export const MODULE_STACK = [
  { name: 'Atina', role: 'API jezgro', icon: Cloud, href: '/admin#system' },
  { name: 'Astra', role: 'Automatizacija', icon: Zap, href: '/dashboard#automations' },
  { name: 'Titan', role: 'Operacije', icon: Sparkles, href: '/admin#workflows' },
] as const;

/** Apply industry-category pricing labels to catalog (once-off service prices stay fixed). */
export function withCatalogPricing(
  categories: CatalogCategory[],
  industryCategory?: string | null,
): CatalogCategory[] {
  return categories.map((cat) => ({
    ...cat,
    items: cat.items.map((item) => {
      if (item.priceOnce != null) return item;
      if (item.priceLabel === 'uključeno') return item;
      if (item.id === 'support-basic') {
        const starter = getPlanPriceForCategory('starter', 'monthly', industryCategory);
        return {
          ...item,
          priceLabel: `uključeno u ${formatEur(starter)}/mes`,
          priceMonthly: starter,
        };
      }
      const minPlan = (item.includedIn?.[0] ?? 'pro') as PlanSlug;
      return {
        ...item,
        priceLabel: getModulePriceLabel(cat.id, industryCategory, item.includedIn),
        priceMonthly: getPlanPriceForCategory(minPlan, 'monthly', industryCategory),
      };
    }),
  }));
}
