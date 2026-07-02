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
import { getDeliverable } from './deliverable-catalog';

/** Services with a deliverable go to /pricing checkout; others stay on /contact. */
export function serviceCatalogHref(serviceId: string): string {
  if (getDeliverable(serviceId)) {
    return `/pricing?service=${encodeURIComponent(serviceId)}`;
  }
  return `/contact?service=${encodeURIComponent(serviceId)}`;
}

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

/** Products — platform software modules grouped by business function. */
export const PRODUCT_CATEGORIES: CatalogCategory[] = [
  {
    id: 'platform',
    title: 'Platform & account',
    subtitle: 'Foundation — sign-in, dashboard, billing, notifications',
    icon: Layers,
    items: [
      {
        id: 'workspace',
        name: 'Client workspace',
        description: 'Dashboard, projects, account, and live data from the Atina API.',
        priceLabel: 'from €39/mo in package',
        includedIn: ['starter', 'pro', 'enterprise'],
        href: '/dashboard',
      },
      {
        id: 'billing-manual',
        name: 'Manual billing (IBAN)',
        description: 'Payment instructions, reference code, and activation without a Stripe company.',
        priceLabel: 'included',
        includedIn: ['starter', 'pro', 'enterprise'],
        href: '/dashboard#billing',
      },
      {
        id: 'admin-ops',
        name: 'Operator console',
        description: 'Admin overview of users, payments, workflow stats, and modules.',
        priceLabel: 'from €99/mo (Growth)',
        includedIn: ['pro', 'enterprise'],
        href: '/admin',
      },
      {
        id: 'notifications',
        name: 'Notifications',
        description: 'In-app and email notifications for your team and clients.',
        priceLabel: 'included',
        includedIn: ['starter', 'pro', 'enterprise'],
        href: '/dashboard',
      },
    ],
  },
  {
    id: 'sales-crm',
    title: 'Sales & CRM',
    subtitle: 'Leads, contacts, contracts, and sales avatar',
    icon: Briefcase,
    items: [
      {
        id: 'crm',
        name: 'CRM module',
        description: 'Contacts, pipeline, and client tracking in one place.',
        priceLabel: 'from €99/mo',
        priceMonthly: 99,
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#projects',
        badge: 'Growth+',
      },
      {
        id: 'titanis',
        name: 'Titanis — sales engine',
        description: 'Lead generation, follow-up sequences, and deal closing.',
        priceLabel: 'from €99/mo',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#sales',
      },
      {
        id: 'contracts',
        name: 'Contracts',
        description: 'Create, track, and digital signature workflows.',
        priceLabel: 'from €99/mo',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#sales',
      },
      {
        id: 'sales-avatar',
        name: 'AI sales avatar',
        description: '4 sales agents — chat and voice for lead qualification.',
        priceLabel: 'from €99/mo',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#sales',
      },
    ],
  },
  {
    id: 'automation',
    title: 'Automation & operations',
    subtitle: 'Tasks, workflows, scraper, and job execution',
    icon: Workflow,
    items: [
      {
        id: 'automation',
        name: 'Automations',
        description: 'Workflow chains, onboarding pipelines, and recurring jobs.',
        priceLabel: 'from €99/mo',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#automations',
      },
      {
        id: 'tasks',
        name: 'Task system',
        description: 'Job queue, statuses, and real-time execution tracking.',
        priceLabel: 'from €99/mo',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#automations',
      },
      {
        id: 'scraper',
        name: 'Web scraper',
        description: 'Collect web data via Apify/Bright Data integration.',
        priceLabel: 'from €99/mo + API costs',
        includedIn: ['pro', 'enterprise'],
        href: '/contact',
      },
      {
        id: 'craftor',
        name: 'Craftor',
        description: 'AI assistant for freelance platforms — proposals, hunting, deploy.',
        priceLabel: 'from €99/mo',
        includedIn: ['pro', 'enterprise'],
        href: '/contact',
        badge: 'Pro',
      },
    ],
  },
  {
    id: 'ai-support',
    title: 'AI & client support',
    subtitle: 'Memory, avatars, video meetings, and RAG',
    icon: Bot,
    items: [
      {
        id: 'ai-memory',
        name: 'AI memory',
        description: 'Long-term context and remember/recall flow for your team.',
        priceLabel: 'from €249/mo (Partner)',
        includedIn: ['enterprise'],
        href: '/dashboard#account',
      },
      {
        id: 'support-avatar',
        name: 'AI support avatar',
        description: 'Avatar team (Mila, Stefan, Jelena) — chat, voice, scheduling.',
        priceLabel: 'from €99/mo',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#support',
      },
      {
        id: 'video-meetings',
        name: 'Video meetings',
        description: 'Zoom, Google Meet, or manual scheduling for support/sales calls.',
        priceLabel: 'from €99/mo',
        includedIn: ['pro', 'enterprise'],
        href: '/dashboard#support',
      },
      {
        id: 'ai-rag',
        name: 'AI knowledge base (RAG)',
        description: 'Search documentation and context for AI answers.',
        priceLabel: 'from €249/mo',
        includedIn: ['enterprise'],
        href: '/contact',
      },
    ],
  },
  {
    id: 'enterprise',
    title: 'Enterprise & media',
    subtitle: 'White-label, compliance, video channels, and gaming pipeline',
    icon: Shield,
    items: [
      {
        id: 'white-label',
        name: 'White-label platform',
        description: 'Your brand, our stack — for agencies and partners.',
        priceLabel: 'from €249/mo',
        priceMonthly: 249,
        includedIn: ['enterprise'],
        href: '/contact',
      },
      {
        id: 'omnitube',
        name: 'OmniTube',
        description: 'Automated pipeline for video channels and content.',
        priceLabel: 'from €99/mo + production',
        includedIn: ['pro', 'enterprise'],
        href: '/contact',
      },
      {
        id: 'omnigame',
        name: 'OmniGame',
        description: 'Validation and pipeline for game projects (Steam integration).',
        priceLabel: 'from €249/mo',
        includedIn: ['enterprise'],
        href: '/contact',
      },
      {
        id: 'dominus360',
        name: 'Dominus360',
        description: 'Risk intelligence, KPIs, and resource management for larger teams.',
        priceLabel: 'from €249/mo',
        includedIn: ['enterprise'],
        href: '/admin',
      },
    ],
  },
];

/** Services — what the team delivers around the platform (one-time or retainer). */
export const SERVICE_CATEGORIES: CatalogCategory[] = [
  {
    id: 'implementation',
    title: 'Implementation & go-live',
    subtitle: 'From empty repo to first paying client',
    icon: Wrench,
    items: [
      {
        id: 'setup-quick',
        name: 'Quick setup',
        description: 'Env, Docker, login, manual billing, contact form, smoke test.',
        priceLabel: '€290',
        priceOnce: 290,
        href: serviceCatalogHref('setup-quick'),
      },
      {
        id: 'setup-full',
        name: 'Full onboarding',
        description: 'CRM, automations, data migration, team training, 30 days of support.',
        priceLabel: '€890',
        priceOnce: 890,
        href: serviceCatalogHref('setup-full'),
        badge: 'Popular',
      },
      {
        id: 'setup-custom',
        name: 'Custom deploy',
        description: 'Your domain, SSL, backup, monitoring, and SLA agreement.',
        priceLabel: 'from €2,490',
        priceOnce: 2490,
        href: serviceCatalogHref('setup-custom'),
      },
    ],
  },
  {
    id: 'consulting',
    title: 'Consulting & architecture',
    subtitle: 'Strategy, integrations, and technical audit',
    icon: Cpu,
    items: [
      {
        id: 'audit',
        name: 'Technical audit',
        description: 'Stack review, security, env check, and production migration plan.',
        priceLabel: '€490',
        priceOnce: 490,
        href: serviceCatalogHref('audit'),
      },
      {
        id: 'integration',
        name: 'Custom integration',
        description: 'Nango, OpenRouter, scraper, email — connect your existing tools.',
        priceLabel: 'from €790',
        priceOnce: 790,
        href: serviceCatalogHref('integration'),
      },
      {
        id: 'workflow-design',
        name: 'Workflow design',
        description: 'Map business processes into automations and task templates.',
        priceLabel: '€590',
        priceOnce: 590,
        href: serviceCatalogHref('workflow-design'),
      },
    ],
  },
  {
    id: 'support-retainer',
    title: 'Support & maintenance',
    subtitle: 'Monthly retainer — peace of mind while the platform runs',
    icon: Headphones,
    items: [
      {
        id: 'support-basic',
        name: 'Email support',
        description: 'Weekdays, response within 48h — included in Business plan.',
        priceLabel: 'included in €39/mo',
        priceMonthly: 39,
        href: '/pricing',
      },
      {
        id: 'support-priority',
        name: 'Priority support',
        description: 'Response within 24h, help with env and minor changes.',
        priceLabel: '€149/mo',
        priceMonthly: 149,
        href: serviceCatalogHref('support-priority'),
      },
      {
        id: 'support-dedicated',
        name: 'Dedicated support',
        description: 'Slack channel, 8h response, monthly health check.',
        priceLabel: '€390/mo',
        priceMonthly: 390,
        href: serviceCatalogHref('support-dedicated'),
        badge: 'Partner',
      },
    ],
  },
  {
    id: 'growth',
    title: 'Growth & marketing',
    subtitle: 'Help selling the platform to your clients',
    icon: LineChart,
    items: [
      {
        id: 'landing',
        name: 'Landing + copy',
        description: 'Custom homepage and copy for your niche.',
        priceLabel: '€690',
        priceOnce: 690,
        href: serviceCatalogHref('landing'),
      },
      {
        id: 'white-label-setup',
        name: 'White-label packaging',
        description: 'Branding, domain, pricing, and materials for partner sales.',
        priceLabel: '€1,490',
        priceOnce: 1490,
        href: serviceCatalogHref('white-label-setup'),
      },
      {
        id: 'sales-enablement',
        name: 'Sales enablement',
        description: 'Demo script, FAQ, onboarding materials for your sales team.',
        priceLabel: '€990',
        priceOnce: 990,
        href: serviceCatalogHref('sales-enablement'),
      },
    ],
  },
];

export const MODULE_STACK = [
  { name: 'Atina', role: 'API core', icon: Cloud, href: '/admin#system' },
  { name: 'Astra', role: 'Automation', icon: Zap, href: '/dashboard#automations' },
  { name: 'Titan', role: 'Operations', icon: Sparkles, href: '/admin#workflows' },
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
      if (item.priceLabel === 'included') return item;
      if (item.id === 'support-basic') {
        const starter = getPlanPriceForCategory('starter', 'monthly', industryCategory);
        return {
          ...item,
          priceLabel: `included in ${formatEur(starter)}/mo`,
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
