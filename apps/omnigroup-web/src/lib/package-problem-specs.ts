/**
 * Client-facing problem lists (5–10 per SKU). Keep in sync with
 * atina-platform/atina/src/modules/billing/lib/package-industry-problems.ts
 */
export type WebPackageProblemSpec = {
  primary: string;
  secondary: string[];
};

export const PACKAGE_PROBLEM_SPECS_WEB: Record<string, WebPackageProblemSpec> = {
  'setup-quick': {
    primary: 'Manual client onboarding and scattered billing',
    secondary: [
      'No unified client portal login',
      'Billing and notifications not in one place',
      'Missing downloadable onboarding documentation',
      'No workspace project to track delivery',
      'Unclear custom-domain DNS steps',
      'Brand welcome materials not generated from signup',
    ],
  },
  'setup-full': {
    primary: 'Operations run on spreadsheets instead of CRM and automations',
    secondary: [
      'Pipeline visibility gaps',
      'Manual follow-ups with no CRM seed',
      'No migration CSV path from legacy tools',
      'No training outline for the team',
      'Automation modules not activated',
      'No registered 30-day support window',
    ],
  },
  'setup-custom': {
    primary: 'Need production-grade deploy without rebuilding the stack',
    secondary: [
      'No deploy manifest for ops teams',
      'Module sprawl across environments',
      'CRM not seeded for go-live',
      'Enterprise handoff PDF missing',
      'Security/backup checklist not packaged',
    ],
  },
  audit: {
    primary: 'No clear picture of security, stack debt, and ROI priorities',
    secondary: [
      'Unknown technical risk',
      'No 90-day roadmap',
      'Competitor blind spots',
      'No security hygiene self-assessment',
      'Stack alternatives not compared',
      'Markdown source not available for editing',
    ],
  },
  integration: {
    primary: 'Tools do not talk to each other — data is copied manually',
    secondary: [
      'API gaps between CRM and finance',
      'Webhook failures undocumented',
      'No integration map for developers',
      'Auth notes missing for third-party tools',
      'Sample events not provided',
    ],
  },
  'workflow-design': {
    primary: 'Processes live in people’s heads, not documented workflows',
    secondary: [
      'SOP gaps between roles',
      'Role confusion on handoffs',
      'KPIs not tied to automation',
      'No process map PDF',
      'Module mapping unclear',
      'Rollout plan not written',
    ],
  },
  'support-priority': {
    primary: 'Clients wait too long for support responses',
    secondary: [
      'No SLA queue with 24h target',
      'FAQ not structured',
      'Support tickets untracked',
      'No ticket categories in portal',
      'AI support assistant not available in inbox',
      'Welcome/onboarding for support channel missing',
    ],
  },
  'support-dedicated': {
    primary: 'Need faster dedicated support without hiring in-house',
    secondary: [
      'No video support channel',
      'Escalations ad hoc',
      'No monthly health review',
      '8h response target not operationalized',
      'Monitoring not bundled with support',
    ],
  },
  landing: {
    primary: 'Weak online presence — leads bounce before contact',
    secondary: [
      'No conversion-focused page',
      'Generic copy not niche-specific',
      'Missing contact capture',
      'No Open Graph / favicon basics',
      'Analytics snippet not prepared',
      'Retargeting pixel placement unclear',
    ],
  },
  'website-business': {
    primary: 'Business looks amateur online — services and pricing unclear',
    secondary: [
      'Single-page site only',
      'No SEO basics (sitemap/robots)',
      'Contact not ready for CRM sync',
      'Services/pricing pages missing',
      'No workspace project link',
      'Google Business Profile setup undefined',
    ],
  },
  'website-ecommerce': {
    primary: 'Cannot demo or sell products online credibly',
    secondary: [
      'No storefront URL',
      'Catalog not digital',
      'Fewer than 4 demo products',
      'Checkout path undocumented',
      'Cart flow unclear for buyers',
    ],
  },
  'white-label-setup': {
    primary: 'Partners need resale-ready branding and packaging',
    secondary: [
      'No partner landing',
      'Brand assets scattered',
      'Resale story unclear',
      'Packaging PDF missing',
      'Hosted landing not live for demos',
    ],
  },
  'sales-enablement': {
    primary: 'Sales team lacks scripts, hooks, and closing consistency',
    secondary: [
      'Ad hoc demos',
      'FAQ gaps',
      'No outreach templates',
      'Closing checklist missing',
      'Industry hooks not written',
    ],
  },
  'vertical-package': {
    primary: 'Need CRM, automation, and billing tuned to the vertical',
    secondary: [
      'Wrong pipeline stages',
      'Industry workflows missing',
      'Support not vertical-aware',
      'Billing modules not activated',
      'No vertical brief PDF',
      'Weekly lead report artifact missing',
    ],
  },
  'lead-gen-retainer': {
    primary: 'Pipeline is empty — outbound and lead research are manual',
    secondary: [
      'No hunt automation workspace',
      'CRM not fed with leads',
      'No monthly lead report',
      'Pipeline refresh not scheduled',
      'Outreach ops not included',
      'Welcome pack for lead-gen lane missing',
    ],
  },
  'ai-support-retainer': {
    primary: 'Clients expect AI support but building RAG + avatar in-house is expensive',
    secondary: [
      'No knowledge base starter',
      'Support not AI-assisted',
      'Video meetings module missing',
      'Support inbox not provisioned',
      'Setup pack for assistant missing',
      'Video avatar render gated on provider keys',
    ],
  },
  'custom-software': {
    primary: 'Need a software foundation but full custom build is over budget',
    secondary: [
      'No starter codebase',
      'Unclear handoff',
      'Tests and docs missing',
      'No isolated workspace project',
      'API + SPA scaffold not delivered',
      'Build/test gate not recorded',
    ],
  },
  'bundle-portal-presence': {
    primary: 'Lose leads online while onboarding stays manual',
    secondary: [
      'No live niche page',
      'Portal and website vendors do not match',
      'Higher total cost from two agencies',
      'Onboarding pack missing',
      'Billing/notifications not live in portal',
    ],
  },
  'bundle-sales-launch': {
    primary: 'Generic pages without scripts — sales and marketing do not convert',
    secondary: [
      'Weak copy',
      'No demo script',
      'Landing not tied to outreach',
      'FAQ gaps for sales',
      'No live URL for campaigns',
    ],
  },
  'bundle-ops-clarity': {
    primary: 'No shared picture of tech debt, process gaps, and what to fix first',
    secondary: [
      'Audit and SOP bought separately',
      'No 90-day plan linked to workflows',
      'Consultants overcharge for basics',
      'Security/stack risks undocumented',
      'Roles and KPIs unclear',
    ],
  },
};

/** Primary + up to 6 secondaries for offer cards (5–7 problems shown). */
export function getOfferProblems(deliverableId: string): string[] {
  const spec = PACKAGE_PROBLEM_SPECS_WEB[deliverableId];
  if (!spec) return [];
  return [spec.primary, ...spec.secondary].slice(0, 7);
}
