/**
 * Per-package × per-industry problem context — source of truth for checkout, avatars, proposals.
 * Keep in sync: apps/omnigroup-web/src/lib/package-industry-problems.ts
 */
import { getCategoryDeliveryProfile } from '../../autonomy-loop/lib/vertical-delivery-profiles';
import { getIndustryCategory } from './category-pricing';
import { DELIVERABLE_CATALOG, getDeliverable, type DeliverableBilling } from './deliverable-catalog';
import { getMaintenanceTiersForPackage, type MaintenanceTier } from './package-maintenance-tiers';

export type PackageProblemSpec = {
  primaryProblemTemplate: string;
  secondaryProblems: string[];
  businessOutcome: string;
};

/** Base problems each of the 17 deliverables solves (before industry tailoring). */
export const PACKAGE_PROBLEM_SPECS: Record<string, PackageProblemSpec> = {
  'setup-quick': {
    primaryProblemTemplate: '{industry} teams lose time on manual client onboarding and scattered billing',
    secondaryProblems: ['No unified client portal', 'Slow quote-to-cash', 'Missing onboarding documentation'],
    businessOutcome: 'Live client portal with billing, notifications, and setup pack in 24–48h',
  },
  'setup-full': {
    primaryProblemTemplate: '{industry} operations run on spreadsheets instead of CRM and automations',
    secondaryProblems: ['Pipeline visibility gaps', 'Manual follow-ups', 'No training or migration path'],
    businessOutcome: 'CRM seeded, automation modules active, and team trained within 30 days',
  },
  'setup-custom': {
    primaryProblemTemplate: '{industry} needs production-grade deploy without rebuilding the stack',
    secondaryProblems: ['No deploy manifest', 'Module sprawl', 'Enterprise onboarding undefined'],
    businessOutcome: 'Production deploy checklist, full module activation, enterprise handoff PDF',
  },
  audit: {
    primaryProblemTemplate: '{industry} lacks a clear picture of security, stack debt, and ROI priorities',
    secondaryProblems: ['Unknown technical risk', 'No 90-day roadmap', 'Competitor blind spots'],
    businessOutcome: 'Actionable audit PDF with security, stack, and ROI sections tailored to niche',
  },
  integration: {
    primaryProblemTemplate: '{industry} tools do not talk to each other — data is copied manually',
    secondaryProblems: ['API gaps between CRM and finance', 'Webhook failures', 'No integration map'],
    businessOutcome: 'Integration guide + config JSON ready for your developer to connect systems',
  },
  'workflow-design': {
    primaryProblemTemplate: '{industry} processes live in people’s heads, not documented workflows',
    secondaryProblems: ['SOP gaps', 'Role confusion', 'KPIs not tied to automation'],
    businessOutcome: 'Process map, automation steps, roles, KPIs, and rollout plan in one PDF pack',
  },
  'support-priority': {
    primaryProblemTemplate: '{industry} clients wait too long for support responses',
    secondaryProblems: ['No SLA queue', 'FAQ not structured', 'Support tickets untracked'],
    businessOutcome: '24h SLA support queue with portal modules and monthly health visibility',
  },
  'support-dedicated': {
    primaryProblemTemplate: '{industry} needs faster, dedicated support without hiring in-house',
    secondaryProblems: ['No video support channel', 'Escalations ad hoc', 'No monthly health review'],
    businessOutcome: '8h SLA, video meetings module, and scheduled health checks included monthly',
  },
  landing: {
    primaryProblemTemplate: '{industry} niche has weak online presence — leads bounce before contact',
    secondaryProblems: ['No conversion-focused page', 'Generic copy', 'Missing contact capture'],
    businessOutcome: 'Live landing at /sites/{slug} with AI copy for your vertical',
  },
  'website-business': {
    primaryProblemTemplate: '{industry} business looks amateur online — services and pricing are unclear',
    secondaryProblems: ['Single-page site only', 'No SEO basics', 'Contact not tied to CRM'],
    businessOutcome: '5+ page business site with services, pricing, contact — live and linked to factory',
  },
  'website-ecommerce': {
    primaryProblemTemplate: '{industry} cannot demo or sell products online credibly',
    secondaryProblems: ['No storefront', 'Checkout undefined', 'Catalog not digital'],
    businessOutcome: 'Demo storefront with 4+ products and checkout documentation',
  },
  'white-label-setup': {
    primaryProblemTemplate: '{industry} partners need resale-ready branding and packaging',
    secondaryProblems: ['No partner landing', 'Brand assets scattered', 'Resale story unclear'],
    businessOutcome: 'White-label brand PDF plus partner landing page live',
  },
  'sales-enablement': {
    primaryProblemTemplate: '{industry} sales team lacks scripts, hooks, and closing consistency',
    secondaryProblems: ['Ad hoc demos', 'FAQ gaps', 'No outreach templates'],
    businessOutcome: 'Demo script, outreach hooks, FAQ, and closing checklist for your niche',
  },
  'vertical-package': {
    primaryProblemTemplate: '{industry} needs CRM, automation, and billing tuned to the vertical — not generic SaaS',
    secondaryProblems: ['Wrong pipeline stages', 'Industry workflows missing', 'Support not vertical-aware'],
    businessOutcome: 'Monthly vertical CRM + automation + billing modules with industry seed data',
  },
  'lead-gen-retainer': {
    primaryProblemTemplate: '{industry} pipeline is empty — outbound and lead research are manual',
    secondaryProblems: ['No hunt automation', 'CRM not fed', 'No monthly lead report'],
    businessOutcome: 'Monthly lead-gen PDF, CRM pipeline, hunter/titanis modules, and lead report',
  },
  'ai-support-retainer': {
    primaryProblemTemplate: '{industry} clients expect AI support but building RAG + avatar in-house is expensive',
    secondaryProblems: ['No knowledge base', 'Support not 24/7', 'Video support missing'],
    businessOutcome: 'AI RAG seed, support avatar, video meetings — maintained monthly',
  },
  'custom-software': {
    primaryProblemTemplate: '{industry} needs a software foundation but full custom build is over budget',
    secondaryProblems: ['No starter codebase', 'Unclear handoff', 'Tests and docs missing'],
    businessOutcome: 'Node API + SPA scaffold, tests, and handoff PDF — bounded starter scope',
  },
};

export type PackageIndustryContext = {
  deliverableId: string;
  industryCategory: string;
  industryLabel: string;
  billing: DeliverableBilling;
  primaryProblem: string;
  secondaryProblems: string[];
  businessOutcome: string;
  industrySolutionPitch: string;
  industryPainPoints: string[];
  recommendedForIndustry: boolean;
  maintenanceIncludedInPrice: boolean;
  optionalMaintenanceTiers: MaintenanceTier[] | null;
};

function applyIndustryLabel(template: string, label: string): string {
  return template.replace(/\{industry\}/gi, label).replace(/\{niche\}/gi, label);
}

function mergeIndustryProblems(base: string[], profile: ReturnType<typeof getCategoryDeliveryProfile>): string[] {
  const industrySpecific = [
    ...profile.researchFocus.slice(0, 2),
    profile.outreachHooks[0],
    profile.qualityGates[0],
  ].filter(Boolean);
  return [...new Set([...industrySpecific, ...base])].slice(0, 5);
}

/** Ensures all 17 catalog SKUs have a problem → solution spec. */
export function assertAllPackagesHaveProblemSpecs(): string[] {
  return DELIVERABLE_CATALOG.filter((d) => !PACKAGE_PROBLEM_SPECS[d.id]).map((d) => d.id);
}

export function getPackageIndustryContext(
  deliverableId: string,
  industryCategory: string,
): PackageIndustryContext | null {
  const deliverable = getDeliverable(deliverableId);
  const spec = PACKAGE_PROBLEM_SPECS[deliverableId];
  if (!deliverable || !spec) return null;

  const cat = getIndustryCategory(industryCategory);
  const label = cat?.name ?? industryCategory.replace(/_/g, ' ');
  const profile = getCategoryDeliveryProfile(industryCategory);
  const recommended = profile.primaryDeliverables.includes(deliverableId);

  const industryPainPoints = [
    ...profile.researchFocus.slice(0, 2),
    ...profile.outreachHooks.slice(0, 1),
  ].filter(Boolean);

  const billing = deliverable.billing;
  const maintenanceIncludedInPrice = billing === 'monthly' || billing === 'yearly';

  const industrySolutionPitch = applyIndustryLabel(profile.valuePropTemplate, label);

  return {
    deliverableId,
    industryCategory,
    industryLabel: label,
    billing,
    primaryProblem: applyIndustryLabel(spec.primaryProblemTemplate, label),
    secondaryProblems: mergeIndustryProblems(spec.secondaryProblems, profile),
    businessOutcome: recommended
      ? `${spec.businessOutcome} — built for ${label} workflows`
      : spec.businessOutcome,
    industrySolutionPitch,
    industryPainPoints,
    recommendedForIndustry: recommended,
    maintenanceIncludedInPrice,
    optionalMaintenanceTiers: maintenanceIncludedInPrice
      ? null
      : getMaintenanceTiersForPackage(deliverableId, billing),
  };
}

export function listPackageIndustryMatrix(industryCategory: string) {
  return Object.keys(PACKAGE_PROBLEM_SPECS)
    .map((id) => getPackageIndustryContext(id, industryCategory))
    .filter((x): x is PackageIndustryContext => x != null);
}
