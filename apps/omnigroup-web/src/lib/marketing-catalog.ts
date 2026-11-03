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
  /** Set when the item maps 1:1 to a billing-engine deliverable; price then comes from the catalog anchor. */
  deliverableId?: string;
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

/**
 * Build a service item from the deliverable catalog so /services never drifts from the billing engine.
 * Prices shown are EU-base anchors; the live quote on /pricing applies industry + region factors.
 */
function serviceFromCatalog(
  id: string,
  overrides: Partial<Pick<CatalogItem, 'description' | 'badge'>> & { from?: boolean } = {},
): CatalogItem {
  const d = getDeliverable(id);
  if (!d) throw new Error(`Unknown deliverable in SERVICE_CATEGORIES: ${id}`);
  const isMonthly = d.billing === 'monthly';
  const price = formatEur(d.anchorEur);
  return {
    id: d.id,
    deliverableId: d.id,
    name: d.name,
    description: overrides.description ?? d.description,
    priceLabel: `${overrides.from ? 'from ' : ''}${price}${isMonthly ? '/mo' : ''}`,
    priceMonthly: isMonthly ? d.anchorEur : undefined,
    priceOnce: isMonthly ? undefined : d.anchorEur,
    href: serviceCatalogHref(d.id),
    badge: overrides.badge,
  };
}

/** Services — what the team delivers around the platform (one-time or retainer). */
export const SERVICE_CATEGORIES: CatalogCategory[] = [
  {
    id: 'ai-automation',
    title: 'AI & automation',
    subtitle: 'Start small, measure, then scale — audit → pilot → retainer',
    icon: Bot,
    items: [
      serviceFromCatalog('audit', {
        description: 'Stack, security, and AI-readiness review with an automation roadmap — fee credited to your first project.',
        badge: 'Start here',
      }),
      serviceFromCatalog('ai-pilot', { badge: 'Popular' }),
      serviceFromCatalog('ai-receptionist'),
      serviceFromCatalog('billing-automation'),
      serviceFromCatalog('compliance-pack'),
    ],
  },
  {
    id: 'implementation',
    title: 'Implementation & go-live',
    subtitle: 'From empty repo to first paying client',
    icon: Wrench,
    items: [
      serviceFromCatalog('setup-quick', {
        description: 'Env, Docker, login, manual billing, contact form, smoke test.',
      }),
      serviceFromCatalog('setup-full', {
        description: 'CRM, automations, data migration, team training, 30 days of support.',
        badge: 'Popular',
      }),
      serviceFromCatalog('setup-custom', {
        description: 'Your domain, SSL, backup, monitoring, and SLA agreement.',
        from: true,
      }),
    ],
  },
  {
    id: 'consulting',
    title: 'Consulting & architecture',
    subtitle: 'Integrations and process design',
    icon: Cpu,
    items: [
      serviceFromCatalog('integration', {
        description: 'Nango, OpenRouter, scraper, email — connect your existing tools.',
        from: true,
      }),
      serviceFromCatalog('workflow-design', {
        description: 'Map business processes into automations and task templates.',
      }),
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
      serviceFromCatalog('website-care'),
      serviceFromCatalog('support-priority', {
        description: 'Response within 24h, help with env and minor changes.',
      }),
      serviceFromCatalog('support-dedicated', {
        description: 'Slack channel, 8h response, monthly health check.',
        badge: 'Partner',
      }),
    ],
  },
  {
    id: 'growth',
    title: 'Growth & marketing',
    subtitle: 'Leads, visibility, and content — delivered monthly or as a one-off',
    icon: LineChart,
    items: [
      serviceFromCatalog('lead-list'),
      serviceFromCatalog('seo-geo-retainer'),
      serviceFromCatalog('video-pipeline-retainer'),
      serviceFromCatalog('landing', { description: 'Custom homepage and copy for your niche.' }),
      serviceFromCatalog('white-label-setup', {
        description: 'Branding, domain, pricing, and materials for partner sales.',
      }),
      serviceFromCatalog('sales-enablement', {
        description: 'Demo script, FAQ, onboarding materials for your sales team.',
      }),
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
      if (item.priceOnce != null || item.deliverableId) return item;
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
