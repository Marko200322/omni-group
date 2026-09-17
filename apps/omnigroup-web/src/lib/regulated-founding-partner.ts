/**
 * Regulated Founding Partner program — acquisition pricing for healthcare,
 * government, energy, and industrial SMBs. Sync concept with sales / billing ops.
 */
import {
  formatEur,
  getPlanPriceForCategory,
  resolvePricingTier,
  type PlanSlug,
} from './category-pricing';

export const REGULATED_FOUNDING_PARTNER = {
  maxSlots: 10,
  /** Fit-based cohort — not first-come-first-served */
  slotMix: {
    healthcare: 2,
    government: 2,
    energy: 2,
    industrial: 2,
    wildcard: 2,
  },
  discounts: {
    year1: 0.4,
    year2: 0.25,
    year3: 0.25,
  },
  /** Waived once for founding partners (list €890) */
  waivedOnboardingEur: 890,
  /** Optional 90-day regulated pilot instead of public Starter list */
  pilot: {
    durationDays: 90,
    priceMonthly: 99,
    maxUsers: 3,
    maxSites: 1,
  },
} as const;

export type RegulatedReadyBundleItem = {
  id: string;
  title: string;
  summary: string;
  /** Included on Pro+ for founding partners; list add-on later */
  includedFromPlan: PlanSlug;
};

/** Compliance value-adds bundled to justify regulated tier vs point solutions. */
export const REGULATED_READY_BUNDLE: RegulatedReadyBundleItem[] = [
  {
    id: 'eu-residency-dpa',
    title: 'EU data residency + signed DPA',
    summary: 'Personal data processed in EU/EEA with a standard Data Processing Agreement.',
    includedFromPlan: 'starter',
  },
  {
    id: 'audit-log-export',
    title: 'Immutable audit log export',
    summary: 'Who changed what, when — exportable for procurement and internal review.',
    includedFromPlan: 'pro',
  },
  {
    id: 'gdpr-dsar',
    title: 'GDPR DSAR & retention workflow',
    summary: 'Request intake, retention rules, and export paths aligned to GDPR expectations.',
    includedFromPlan: 'pro',
  },
  {
    id: 'iso27001-lite',
    title: 'ISO 27001 control mapping (lite)',
    summary: 'Pre-mapped controls to speed security questionnaires and vendor reviews.',
    includedFromPlan: 'pro',
  },
  {
    id: 'nis2-checklist',
    title: 'NIS2 / sector readiness checklist',
    summary: 'Energy and industrial buyers get a structured readiness baseline.',
    includedFromPlan: 'pro',
  },
  {
    id: 'hipaa-policy-pack',
    title: 'HIPAA-oriented policy pack + BAA template',
    summary: 'Healthcare and health-adjacent teams get starter policies and BAA wording.',
    includedFromPlan: 'pro',
  },
  {
    id: 'rbac-session-log',
    title: 'Role-based access + session logging',
    summary: 'Least-privilege roles with sign-in and session activity retained.',
    includedFromPlan: 'starter',
  },
  {
    id: 'procurement-invoice',
    title: 'Annual procurement invoice',
    summary: 'Invoice-friendly billing for public sector and clinic procurement.',
    includedFromPlan: 'pro',
  },
  {
    id: 'sla-999',
    title: '99.9% uptime SLA',
    summary: 'Named SLA on Partner; Growth includes standard regulated support targets.',
    includedFromPlan: 'enterprise',
  },
  {
    id: 'compliance-onboarding',
    title: 'Compliance onboarding pack',
    summary: 'Policies, ROPA starter, and incident template — replaces the first consultant week.',
    includedFromPlan: 'pro',
  },
  {
    id: 'quarterly-posture-pdf',
    title: 'Quarterly compliance posture PDF',
    summary: 'Board-ready summary of access, incidents, and control status.',
    includedFromPlan: 'enterprise',
  },
];

export const REGULATED_READY_ADDON_LIST_EUR = 79;

export function isRegulatedIndustryCategory(industryCategory?: string | null): boolean {
  return resolvePricingTier(industryCategory) === 'regulated';
}

export function getFoundingPartnerDiscount(year: 1 | 2 | 3): number {
  if (year === 1) return REGULATED_FOUNDING_PARTNER.discounts.year1;
  return REGULATED_FOUNDING_PARTNER.discounts.year2;
}

export function getFoundingPartnerMonthlyPrice(
  planSlug: PlanSlug,
  industryCategory: string,
  year: 1 | 2 | 3 = 1,
): number {
  const list = getPlanPriceForCategory(planSlug, 'monthly', industryCategory);
  const discount = getFoundingPartnerDiscount(year);
  return Math.max(9, Math.round(list * (1 - discount)));
}

export type FoundingPartnerPlanQuote = {
  planSlug: PlanSlug;
  listMonthly: number;
  foundingYear1Monthly: number;
  foundingYear2Monthly: number;
  savingsYear1Monthly: number;
};

export function getFoundingPartnerQuotes(industryCategory: string): FoundingPartnerPlanQuote[] {
  const plans: PlanSlug[] = ['starter', 'pro', 'enterprise'];
  return plans.map((planSlug) => {
    const listMonthly = getPlanPriceForCategory(planSlug, 'monthly', industryCategory);
    const foundingYear1Monthly = getFoundingPartnerMonthlyPrice(planSlug, industryCategory, 1);
    const foundingYear2Monthly = getFoundingPartnerMonthlyPrice(planSlug, industryCategory, 2);
    return {
      planSlug,
      listMonthly,
      foundingYear1Monthly,
      foundingYear2Monthly,
      savingsYear1Monthly: listMonthly - foundingYear1Monthly,
    };
  });
}

export function getRegulatedReadyItemsForPlan(planSlug: PlanSlug): RegulatedReadyBundleItem[] {
  const order: PlanSlug[] = ['starter', 'pro', 'enterprise'];
  const minIdx = order.indexOf(planSlug);
  return REGULATED_READY_BUNDLE.filter((item) => order.indexOf(item.includedFromPlan) <= minIdx);
}

export const FOUNDING_PARTNER_PUBLIC_COPY = {
  headline: 'Regulated Founding Partner',
  subhead:
    'First 10 fit-based partners in healthcare, government, energy, and industrial — locked pricing, compliance bundle, and roadmap influence.',
  terms: [
    '40% off Growth (Pro) year one, 25% off years two and three, then standard regulated list',
    'Full onboarding (€890) waived for founding partners',
    'Regulated Ready compliance bundle included on Growth and above',
    'Annual invoice available for procurement',
    'Quarterly feedback call + case study or reference in exchange',
  ],
  cta: 'Apply for founding partner pricing',
  ctaHref: '/contact?topic=regulated-founding-partner',
  pilotHeadline: '90-day regulated pilot',
  pilotCopy:
    'Not ready for Growth list price? €99/mo for 90 days — one site, up to 3 users, EU stack and audit basics.',
} as const;

export { formatEur };
