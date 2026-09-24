import { getIndustryCategory } from './category-pricing';
import { fixPublicAcronyms, formatPublicTitle } from './industry-catalog';
import { isRegulatedIndustryCategory } from './regulated-founding-partner';
import { SAAS_PLANS } from './saas-plans';

const GENERIC_PAINS = [
  'leads sit in inboxes instead of a pipeline',
  'invoices and delivery status live in different tools',
  'handoffs between sales and fulfillment get lost',
  'support questions repeat because nothing is documented',
  'reporting is a spreadsheet rebuilt every Friday',
  'new hires cannot see what the last project promised',
  'quotes stall while someone hunts for the latest price list',
  'clients ask for status because there is no portal',
  'renewals surprise the team because dates live in chat',
  'operations still copy data between CRM and billing',
];

const CATEGORY_PAINS: Record<string, string[]> = {
  healthcare: [
    'patient intake notes live in email instead of one record',
    'follow-ups after visits are easy to miss',
    'staff cannot see what was promised on the last call',
    'billing and clinical notes sit in different tools',
  ],
  finance_accounting: [
    'client documents arrive as email attachments',
    'deadlines live in a shared spreadsheet nobody trusts',
    'renewals surprise the team because dates live in chat',
    'quotes stall while someone hunts the latest rate card',
  ],
  legal_services: [
    'intake forms and case notes live in separate inboxes',
    'deadlines are tracked in personal calendars',
    'clients ask for status because there is no portal',
    'document versions multiply across email threads',
  ],
  government: [
    'requests arrive through too many unofficial channels',
    'status updates are rebuilt for every stakeholder',
    'handoffs between teams get lost between tools',
    'documentation is hard to find when an audit starts',
  ],
  marketing: [
    'campaign briefs live in chat instead of a brief record',
    'approvals stall while files sit in three drives',
    'retainers renew without a clear delivery log',
    'clients cannot see what shipped last month',
  ],
  automotive: [
    'service bookings and follow-ups live in the inbox',
    'parts and job status are tracked on paper',
    'repeat customers are hard to recognize at the counter',
    'invoices and delivery dates sit in different tools',
  ],
  education_training: [
    'enrollments arrive as form dumps with no pipeline',
    'cohort schedules live in a spreadsheet',
    'students ask for materials because nothing is centralized',
    'renewals for next term surprise the office',
  ],
  real_estate: [
    'leads sit in inboxes instead of a viewing pipeline',
    'listing documents are scattered across drives',
    'follow-ups after viewings are easy to miss',
    'commission and status live in different tools',
  ],
};

const ANGLES = [
  'one workspace for CRM, billing, and delivery',
  'a client portal your buyers can actually log into',
  'AI drafts that stay inside your operating process',
  'expert services when you want a human to implement it',
  'subscription plans that match how the work actually ships',
  'a single source of truth for orders, files, and invoices',
];

const HEADLINE_SHAPES = [
  (name: string) => `${name} operations in one workspace`,
  (name: string) => `Run ${name} delivery without spreadsheet chaos`,
  (name: string) => `${name}: CRM, billing, and handoffs together`,
  (name: string) => `A quieter operating system for ${name} teams`,
];

function hashSlug(slug: string): number {
  let hash = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], seed: number, offset = 0): T {
  return items[(seed + offset) % items.length] as T;
}

function painsFor(category: string): string[] {
  return CATEGORY_PAINS[category] ?? GENERIC_PAINS;
}

function isGenericCatalogBlurb(text: string): boolean {
  return /end-to-end delivery for .+: crm, automations, lead gen/i.test(text);
}

export function buildVerticalLandingCopy(input: {
  slug: string;
  name: string;
  category: string;
  valueProp?: string | null;
}) {
  const seed = hashSlug(input.slug);
  const category = getIndustryCategory(input.category)?.name ?? input.category.replace(/_/g, ' ');
  const name = formatPublicTitle(input.name);
  const painPool = painsFor(input.category);
  const pain = pick(painPool, seed);
  const angle = pick(ANGLES, seed, 2);
  const headlineFn = pick(HEADLINE_SHAPES, seed, 1);
  const launch = SAAS_PLANS[0];
  const existing = fixPublicAcronyms(input.valueProp?.trim() ?? '');
  const generated = `${name} teams usually stall when ${pain}. Omni Group gives ${category} operators ${angle}, starting from ${launch.name} at €${launch.monthly.EUR} / $${launch.monthly.USD} per month. Expert services are scoped deliverables — a portal, documents, or a live page — not a custom rebuild of the whole practice.`;
  const lede = existing.length >= 80 && !isGenericCatalogBlurb(existing) ? existing : generated;

  return {
    eyebrow: category,
    headline: headlineFn(name),
    lede,
    pains: [pick(painPool, seed, 1), pick(painPool, seed, 4), pick(painPool, seed, 2)],
    saasLine: `Start on ${launch.name}, then add a scoped expert service if this niche needs a done-for-you setup.`,
    regulated: isRegulatedIndustryCategory(input.category),
  };
}
