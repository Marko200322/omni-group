import type { PlanSlug } from './category-pricing';

export type BillingCurrency = 'EUR' | 'USD';
export type SaaSBillingCycle = 'monthly' | 'yearly';

export type SaaSPlan = {
  slug: PlanSlug;
  name: string;
  tagline: string;
  highlighted: boolean;
  monthly: Record<BillingCurrency, number>;
  yearly: Record<BillingCurrency, number>;
  features: string[];
  limits: {
    workspaces: number | 'unlimited';
    users: number | 'unlimited';
    contacts: number | 'unlimited';
  };
};

/**
 * Canonical public SaaS price book.
 *
 * Annual prices equal ten monthly payments. Keep the Atina mirror and database
 * migration in sync; the enterprise readiness gate verifies parity.
 */
export const SAAS_PLANS: readonly SaaSPlan[] = [
  {
    slug: 'starter',
    name: 'Launch',
    tagline: 'For one business replacing disconnected tools',
    highlighted: false,
    monthly: { EUR: 79, USD: 89 },
    yearly: { EUR: 790, USD: 890 },
    features: [
      'CRM, pipeline, and lead capture',
      'Client portal, projects, and deliveries',
      'Invoices, documents, and notifications',
      'AI assistant and guided onboarding',
      'Core workflow automations',
    ],
    limits: { workspaces: 1, users: 5, contacts: 2500 },
  },
  {
    slug: 'pro',
    name: 'Growth',
    tagline: 'For teams running sales and operations together',
    highlighted: true,
    monthly: { EUR: 249, USD: 279 },
    yearly: { EUR: 2490, USD: 2790 },
    features: [
      'Everything in Launch',
      'Advanced workflows and automation runs',
      'AI memory, analytics, and priority support',
      'API access and custom integrations',
      'Three separate workspaces',
    ],
    limits: { workspaces: 3, users: 25, contacts: 25000 },
  },
  {
    slug: 'enterprise',
    name: 'Scale',
    tagline: 'For agencies and multi-workspace operators',
    highlighted: false,
    monthly: { EUR: 429, USD: 469 },
    yearly: { EUR: 4290, USD: 4690 },
    features: [
      'Everything in Growth',
      'Unlimited workspaces, users, and contacts',
      'White-label client experience',
      'Advanced RBAC, audit exports, and SLA',
      'Dedicated onboarding and migration plan',
    ],
    limits: { workspaces: 'unlimited', users: 'unlimited', contacts: 'unlimited' },
  },
] as const;

export function getSaaSPlan(slug: PlanSlug): SaaSPlan {
  const plan = SAAS_PLANS.find((item) => item.slug === slug);
  if (!plan) throw new Error(`Unknown SaaS plan: ${slug}`);
  return plan;
}

export function getSaaSPlanPrice(
  slug: PlanSlug,
  cycle: SaaSBillingCycle,
  currency: BillingCurrency,
): number {
  return getSaaSPlan(slug)[cycle][currency];
}

export function formatPlanMoney(amount: number, currency: BillingCurrency): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

