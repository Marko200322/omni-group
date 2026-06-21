/** Legacy platform plan metadata — INTERNAL ONLY, not sold publicly. Use deliverable-catalog for client pricing. */
import {
  BASE_PLAN_PRICES,
  formatEur,
  getPlanPriceForCategory,
  type PlanSlug,
} from './category-pricing';

export { formatEur };

export type MarketingPlan = {
  slug: PlanSlug;
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  currency: 'EUR';
  highlight: boolean;
  forWho: string;
  features: string[];
  cta: string;
  href: string;
};

const MARKETING_PLAN_META: Omit<MarketingPlan, 'priceMonthly' | 'priceYearly'>[] = [
  {
    slug: 'starter',
    name: 'Business',
    tagline: 'For founders and solo teams',
    currency: 'EUR',
    highlight: false,
    forWho: 'Business owners, freelancers, or small agencies who want one panel instead of chaos in spreadsheets and chat apps.',
    features: [
      'Client dashboard and account',
      'Basic CRM and notifications',
      'Manual / bank transfer billing (no Stripe company required)',
      'Email support',
      '1 user · up to 50 tasks per month',
    ],
    cta: 'Get started — Business',
    href: '/login?next=/dashboard%23billing',
  },
  {
    slug: 'pro',
    name: 'Growth',
    tagline: 'For teams automating sales and operations',
    currency: 'EUR',
    highlight: true,
    forWho: 'Teams of 3–15 selling services, managing clients, and wanting AI support plus automations.',
    features: [
      'Everything in Business',
      'Automations, contracts, analytics',
      'Web scraper and CRM pipeline',
      'AI avatar for support and sales',
      'Up to 10 team members',
    ],
    cta: 'Most popular — Growth',
    href: '/login?next=/dashboard%23billing',
  },
  {
    slug: 'enterprise',
    name: 'Partner',
    tagline: 'For larger teams and white-label partners',
    currency: 'EUR',
    highlight: false,
    forWho: 'Agencies, larger SMBs, and partners reselling the platform under their own brand.',
    features: [
      'All platform modules',
      'White-label and priority support',
      'Unlimited tasks',
      'SLA and custom integrations by agreement',
      'Onboarding with our team',
    ],
    cta: 'Book a demo',
    href: '/contact',
  },
];

/** Base marketing plans (standard tier / no category). */
export const MARKETING_PLANS: MarketingPlan[] = MARKETING_PLAN_META.map((meta) => ({
  ...meta,
  priceMonthly: BASE_PLAN_PRICES[meta.slug].monthly,
  priceYearly: BASE_PLAN_PRICES[meta.slug].yearly,
}));

/** Plans adjusted for an industry category (healthcare, retail, …). */
export function getMarketingPlansForCategory(industryCategory?: string | null): MarketingPlan[] {
  return MARKETING_PLAN_META.map((meta) => ({
    ...meta,
    priceMonthly: getPlanPriceForCategory(meta.slug, 'monthly', industryCategory),
    priceYearly: getPlanPriceForCategory(meta.slug, 'yearly', industryCategory),
  }));
}

export const IMPLEMENTATION_ADDONS = [
  {
    name: 'Quick setup',
    price: '€290',
    once: true,
    desc: 'Env, login, manual billing, contact form — ready for first clients in 1–2 days.',
  },
  {
    name: 'Full onboarding',
    price: '€890',
    once: true,
    desc: 'Data migration, CRM, automations, team training, and 30 days of support.',
  },
  {
    name: 'Custom project',
    price: 'from €2,490',
    once: true,
    desc: 'Integrations, custom workflows, deploy on your domain, and SLA.',
  },
];
