/**
 * Per-package × per-industry problem context — source of truth for checkout, avatars, proposals.
 * Each package must list 5–10 problems it attacks (primary + secondaryProblems).
 * Keep claims honest: only problems the delivery/checklist can actually address.
 */
import { getCategoryDeliveryProfile } from '../../autonomy-loop/lib/vertical-delivery-profiles';
import { getIndustryCategory } from './category-pricing';
import { DELIVERABLE_CATALOG, getDeliverable, type DeliverableBilling } from './deliverable-catalog';
import { getMaintenanceTiersForPackage, type MaintenanceTier } from './package-maintenance-tiers';
import { getIndustryCompetitiveBonusIncludes } from './industry-competitive-includes';

export type PackageProblemSpec = {
  primaryProblemTemplate: string;
  /** Target 4–9 items so primary+secondary = 5–10 client problems. */
  secondaryProblems: string[];
  businessOutcome: string;
};

/** Base problems each catalog SKU solves (before industry tailoring). */
export const PACKAGE_PROBLEM_SPECS: Record<string, PackageProblemSpec> = {
  'setup-quick': {
    primaryProblemTemplate: '{industry} teams lose time on manual client onboarding and scattered billing',
    secondaryProblems: [
      'No unified client portal login',
      'Billing and notifications not in one place',
      'Missing downloadable onboarding documentation',
      'No workspace project to track delivery',
      'Unclear custom-domain DNS steps (client keeps DNS)',
      'Brand welcome materials not generated from signup',
    ],
    businessOutcome: 'Live client portal with billing, notifications, and setup pack in 24–48h',
  },
  'setup-full': {
    primaryProblemTemplate: '{industry} operations run on spreadsheets instead of CRM and automations',
    secondaryProblems: [
      'Pipeline visibility gaps',
      'Manual follow-ups with no CRM seed',
      'No migration CSV path from legacy tools',
      'No training outline for the team',
      'Automation modules not activated',
      'No registered 30-day support window',
      'Industry workflow templates missing',
    ],
    businessOutcome: 'CRM seeded, automation modules active, and team trained within 30 days',
  },
  'setup-custom': {
    primaryProblemTemplate: '{industry} needs production-grade deploy without rebuilding the stack',
    secondaryProblems: [
      'No deploy manifest for ops teams',
      'Module sprawl across environments',
      'CRM not seeded for go-live',
      'Enterprise handoff PDF missing',
      'Security/backup checklist not packaged',
      'Admin runbook undefined',
    ],
    businessOutcome: 'Production deploy checklist, full module activation, enterprise handoff PDF',
  },
  audit: {
    primaryProblemTemplate: '{industry} lacks a clear picture of security, stack debt, and ROI priorities',
    secondaryProblems: [
      'Unknown technical risk',
      'No 90-day roadmap',
      'Competitor blind spots',
      'No security hygiene self-assessment',
      'Stack alternatives not compared',
      'Sales follow-up lacks enrichment notes',
      'Markdown source not available for editing',
    ],
    businessOutcome: 'Actionable audit PDF with security, stack, and ROI sections tailored to niche',
  },
  integration: {
    primaryProblemTemplate: '{industry} tools do not talk to each other — data is copied manually',
    secondaryProblems: [
      'API gaps between CRM and finance',
      'Webhook failures undocumented',
      'No integration map for developers',
      'Auth notes missing for third-party tools',
      'Sample events not provided',
      'Config JSON not downloadable',
    ],
    businessOutcome: 'Integration guide + config JSON ready for your developer to connect systems',
  },
  'workflow-design': {
    primaryProblemTemplate: '{industry} processes live in people’s heads, not documented workflows',
    secondaryProblems: [
      'SOP gaps between roles',
      'Role confusion on handoffs',
      'KPIs not tied to automation',
      'No process map PDF',
      'Module mapping unclear',
      'Portal automation activation map missing',
      'Rollout plan not written',
    ],
    businessOutcome: 'Process map, automation steps, roles, KPIs, and rollout plan in one PDF pack',
  },
  'support-priority': {
    primaryProblemTemplate: '{industry} clients wait too long for support responses',
    secondaryProblems: [
      'No SLA queue with 24h target',
      'FAQ not structured',
      'Support tickets untracked',
      'No ticket categories in portal',
      'AI support assistant not available in inbox',
      'No monthly health visibility',
      'Welcome/onboarding for support channel missing',
    ],
    businessOutcome: '24h SLA support queue with portal modules and monthly health visibility',
  },
  'support-dedicated': {
    primaryProblemTemplate: '{industry} needs faster, dedicated support without hiring in-house',
    secondaryProblems: [
      'No video support channel',
      'Escalations ad hoc',
      'No monthly health review',
      '8h response target not operationalized',
      'Monitoring not bundled with support',
      'Welcome pack missing for dedicated lane',
    ],
    businessOutcome: '8h SLA, video meetings module, and scheduled health checks included monthly',
  },
  landing: {
    primaryProblemTemplate: '{industry} niche has weak online presence — leads bounce before contact',
    secondaryProblems: [
      'No conversion-focused page',
      'Generic copy not niche-specific',
      'Missing contact capture',
      'No Open Graph / favicon basics',
      'Analytics snippet not prepared',
      'Retargeting pixel placement unclear',
      'No competitor landing teardown checklist',
    ],
    businessOutcome: 'Live landing at /sites/{slug} with AI copy for your vertical',
  },
  'website-business': {
    primaryProblemTemplate: '{industry} business looks amateur online — services and pricing are unclear',
    secondaryProblems: [
      'Single-page site only',
      'No SEO basics (sitemap/robots)',
      'Contact not ready for CRM sync',
      'Services/pricing pages missing',
      'No workspace project link',
      'Google Business Profile setup undefined',
      'No path to monthly content refresh',
    ],
    businessOutcome: '5+ page business site with services, pricing, contact — live and linked to factory',
  },
  'website-ecommerce': {
    primaryProblemTemplate: '{industry} cannot demo or sell products online credibly',
    secondaryProblems: [
      'No storefront URL',
      'Catalog not digital',
      'Fewer than 4 demo products',
      'Checkout path undocumented',
      'Cart flow unclear for buyers',
      'Not positioned as demo vs live merchant shop',
    ],
    businessOutcome: 'Demo storefront with 4+ products and checkout documentation',
  },
  'white-label-setup': {
    primaryProblemTemplate: '{industry} partners need resale-ready branding and packaging',
    secondaryProblems: [
      'No partner landing',
      'Brand assets scattered',
      'Resale story unclear',
      'Packaging PDF missing',
      'Hosted landing not live for demos',
      'Legal/DNS still on partner (honest exclude)',
    ],
    businessOutcome: 'White-label brand PDF plus partner landing page live',
  },
  'sales-enablement': {
    primaryProblemTemplate: '{industry} sales team lacks scripts, hooks, and closing consistency',
    secondaryProblems: [
      'Ad hoc demos',
      'FAQ gaps',
      'No outreach templates',
      'Closing checklist missing',
      'Industry hooks not written',
      'Enablement PDF not downloadable',
    ],
    businessOutcome: 'Demo script, outreach hooks, FAQ, and closing checklist for your niche',
  },
  'vertical-package': {
    primaryProblemTemplate: '{industry} needs CRM, automation, and billing tuned to the vertical — not generic SaaS',
    secondaryProblems: [
      'Wrong pipeline stages',
      'Industry workflows missing',
      'Support not vertical-aware',
      'Billing modules not activated',
      'No vertical brief PDF',
      'Weekly lead report artifact missing',
      'Ongoing maintenance path unclear',
    ],
    businessOutcome: 'Monthly vertical CRM + automation + billing modules with industry seed data',
  },
  'lead-gen-retainer': {
    primaryProblemTemplate: '{industry} pipeline is empty — outbound and lead research are manual',
    secondaryProblems: [
      'No hunt automation workspace',
      'CRM not fed with leads',
      'No monthly lead report',
      'Pipeline refresh not scheduled',
      'Outreach ops not included',
      'Autonomy campaign suggestions missing from report',
      'Welcome pack for lead-gen lane missing',
    ],
    businessOutcome: 'Monthly lead-gen PDF, CRM pipeline, hunter/titanis modules, and lead report',
  },
  'ai-support-retainer': {
    primaryProblemTemplate: '{industry} clients expect AI support but building RAG + avatar in-house is expensive',
    secondaryProblems: [
      'No knowledge base starter',
      'Support not AI-assisted',
      'Video meetings module missing',
      'Support inbox not provisioned',
      'Setup pack for assistant missing',
      'Monthly knowledge updates undefined',
      'Video avatar render gated on provider keys (honest)',
    ],
    businessOutcome: 'AI RAG seed, support avatar, video meetings — maintained monthly',
  },
  'custom-software': {
    primaryProblemTemplate: '{industry} needs a software foundation but full custom build is over budget',
    secondaryProblems: [
      'No starter codebase',
      'Unclear handoff',
      'Tests and docs missing',
      'No isolated workspace project',
      'API + SPA scaffold not delivered',
      'Build/test gate not recorded',
      'Scope creep risk without bounded starter',
    ],
    businessOutcome: 'Node API + SPA scaffold, tests, and handoff PDF — bounded starter scope',
  },
  'bundle-portal-presence': {
    primaryProblemTemplate:
      '{industry} firms lose leads online while client onboarding stays manual — portal and landing are bought separately elsewhere',
    secondaryProblems: [
      'No live niche page',
      'Portal and website vendors do not match',
      'Higher total cost from two agencies',
      'Onboarding pack missing',
      'Billing/notifications not live in portal',
      'Contact capture not on niche landing',
    ],
    businessOutcome: 'Client portal live plus niche landing page — one bundle, one timeline',
  },
  'bundle-sales-launch': {
    primaryProblemTemplate:
      '{industry} teams publish generic pages without scripts — sales and marketing do not convert',
    secondaryProblems: [
      'Weak copy',
      'No demo script',
      'Landing not tied to outreach',
      'FAQ gaps for sales',
      'No live URL for campaigns',
      'Enablement PDF missing',
    ],
    businessOutcome: 'Live landing with sales enablement PDF and niche hooks in one package',
  },
  'bundle-ops-clarity': {
    primaryProblemTemplate:
      '{industry} leadership lacks a shared picture of tech debt, process gaps, and what to fix first',
    secondaryProblems: [
      'Audit and SOP bought separately',
      'No 90-day plan linked to workflows',
      'Consultants overcharge for basics',
      'Security/stack risks undocumented',
      'Roles and KPIs unclear',
      'Module mapping missing',
    ],
    businessOutcome: 'Technical audit PDF plus workflow/SOP pack aligned to your industry priorities',
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
  competitiveBonusIncludes: string[];
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
  return [...new Set([...industrySpecific, ...base])].slice(0, 9);
}

/** Ensures all catalog SKUs have a problem → solution spec. */
export function assertAllPackagesHaveProblemSpecs(): string[] {
  return DELIVERABLE_CATALOG.filter((d) => !PACKAGE_PROBLEM_SPECS[d.id]).map((d) => d.id);
}

/** OmniTrix: each package must declare 5–10 problems (primary + secondary). */
export function assertPackageProblemDepth(min = 5, max = 10): Array<{ id: string; count: number }> {
  return Object.entries(PACKAGE_PROBLEM_SPECS)
    .map(([id, s]) => ({ id, count: 1 + s.secondaryProblems.length }))
    .filter((r) => r.count < min || r.count > max);
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
    competitiveBonusIncludes: getIndustryCompetitiveBonusIncludes(
      industryCategory,
      deliverableId,
      recommended,
    ),
  };
}

export function listPackageIndustryMatrix(industryCategory: string) {
  return Object.keys(PACKAGE_PROBLEM_SPECS)
    .map((id) => getPackageIndustryContext(id, industryCategory))
    .filter((x): x is PackageIndustryContext => x != null);
}
