/**
 * Public factory portfolio — curated from live soft IBAN fulfillment runs.
 * Live /sites come from Atina public-site API; package×industry matrix is evidence-backed.
 */

export type PortfolioPackageRow = {
  id: string;
  name: string;
  industries: string[];
  completedExamples: number;
};

/** From docs/evidence/_portfolio-multi-20261025-0013 + GTM full 23/23. */
export const PORTFOLIO_PACKAGE_MATRIX: PortfolioPackageRow[] = [
  { id: 'setup-quick', name: 'Quick setup', industries: ['healthcare', 'finance', 'technology'], completedExamples: 6 },
  { id: 'setup-full', name: 'Full onboarding', industries: ['finance', 'legal', 'construction', 'manufacturing'], completedExamples: 4 },
  { id: 'setup-custom', name: 'Production runbook', industries: ['technology', 'education', 'hospitality', 'retail'], completedExamples: 4 },
  { id: 'audit', name: 'Technical audit', industries: ['legal', 'finance', 'professional', 'marketing', 'ecommerce'], completedExamples: 7 },
  { id: 'integration', name: 'Custom integration', industries: ['construction', 'customer_service', 'sales', 'automotive'], completedExamples: 4 },
  { id: 'workflow-design', name: 'Workflow design', industries: ['manufacturing', 'legal', 'fitness', 'logistics'], completedExamples: 5 },
  { id: 'support-priority', name: 'Priority support', industries: ['retail', 'nonprofit', 'media', 'agriculture'], completedExamples: 4 },
  { id: 'support-dedicated', name: 'Dedicated support', industries: ['hospitality', 'travel', 'energy', 'home_services'], completedExamples: 4 },
  { id: 'landing', name: 'Landing + copy', industries: ['real-estate', 'pets', 'entertainment', 'government'], completedExamples: 4 },
  { id: 'website-business', name: 'Business website', industries: ['education', 'construction', 'development_it', 'real-estate', 'industrial'], completedExamples: 5 },
  { id: 'website-ecommerce', name: 'E-commerce storefront', industries: ['ecommerce', 'photography', 'hr_recruiting', 'design_creative'], completedExamples: 4 },
  { id: 'white-label-setup', name: 'White-label packaging', industries: ['marketing', 'technology', 'finance', 'healthcare'], completedExamples: 4 },
  { id: 'sales-enablement', name: 'Sales enablement', industries: ['professional', 'legal', 'construction', 'manufacturing'], completedExamples: 4 },
  { id: 'vertical-package', name: 'Vertical solution', industries: ['automotive', 'education', 'hospitality', 'retail'], completedExamples: 4 },
  { id: 'lead-gen-retainer', name: 'Lead gen retainer', industries: ['sales', 'professional', 'marketing', 'ecommerce'], completedExamples: 4 },
  { id: 'ai-support-retainer', name: 'AI support retainer', industries: ['customer_service', 'sales', 'automotive'], completedExamples: 4 },
  { id: 'custom-software', name: 'Software starter kit', industries: ['logistics', 'fitness', 'beauty'], completedExamples: 4 },
  { id: 'bundle-portal-presence', name: 'Portal + presence', industries: ['fitness', 'nonprofit', 'media', 'agriculture'], completedExamples: 4 },
  { id: 'bundle-sales-launch', name: 'Sales launch bundle', industries: ['beauty', 'travel', 'energy', 'home_services'], completedExamples: 4 },
  { id: 'bundle-ops-clarity', name: 'Ops clarity bundle', industries: ['agriculture', 'pets', 'entertainment', 'government'], completedExamples: 4 },
  { id: 'seo-audit', name: 'SEO audit + 90-day roadmap', industries: ['media', 'technology', 'real-estate', 'industrial'], completedExamples: 6 },
  { id: 'email-marketing', name: 'Email & SMS marketing', industries: ['nonprofit', 'retail', 'photography', 'hr_recruiting'], completedExamples: 5 },
  { id: 'reputation-management', name: 'Reputation & reviews', industries: ['home_services', 'healthcare', 'finance', 'retail', 'technology'], completedExamples: 5 },
];

export const PORTFOLIO_PROOF = {
  evidenceRun: '2026-10-25',
  softCompleted: '23/23 base packages (GTM) + 103 multi-industry examples',
  catalog: '23 capabilities × 50 industries ≈ 1,150 sellable SKUs',
  honesty:
    'Live sites below are real factory publishes under omnigrouptech.com/sites/… — not stock templates. Soft start uses bank transfer; card LIVE is separate.',
};

export type PublishedSiteCard = {
  slug: string;
  title: string;
  siteType: string;
  publicUrl: string;
  industryHint: string;
};

const INDUSTRY_HINTS: Array<{ match: RegExp; label: string }> = [
  { match: /healthcare|clinic|dental/i, label: 'healthcare' },
  { match: /finance|bank|fintech/i, label: 'finance' },
  { match: /technolog|software|dev/i, label: 'technology' },
  { match: /legal|law/i, label: 'legal' },
  { match: /construct/i, label: 'construction' },
  { match: /educat|school|studio-7f51|studio-33029/i, label: 'education' },
  { match: /e-?commerce|store/i, label: 'ecommerce' },
  { match: /market/i, label: 'marketing' },
  { match: /real-?estate|realty/i, label: 'real-estate' },
  { match: /fitness/i, label: 'fitness' },
  { match: /beauty/i, label: 'beauty' },
  { match: /travel/i, label: 'travel' },
  { match: /energy/i, label: 'energy' },
  { match: /agricultur/i, label: 'agriculture' },
  { match: /nonprofit/i, label: 'nonprofit' },
  { match: /media/i, label: 'media' },
  { match: /photo/i, label: 'photography' },
  { match: /hr.?recruit|recruit/i, label: 'hr_recruiting' },
  { match: /industrial/i, label: 'industrial' },
  { match: /pets/i, label: 'pets' },
  { match: /government/i, label: 'government' },
  { match: /entertainment/i, label: 'entertainment' },
  { match: /home.?service/i, label: 'home_services' },
  { match: /hospitality|hotel/i, label: 'hospitality' },
  { match: /logistic/i, label: 'logistics' },
  { match: /automotive|auto/i, label: 'automotive' },
  { match: /manufactur/i, label: 'manufacturing' },
  { match: /retail/i, label: 'retail' },
  { match: /design|creative/i, label: 'design_creative' },
];

export function industryHintFromSite(slug: string, title: string): string {
  const hay = `${slug} ${title}`;
  for (const row of INDUSTRY_HINTS) {
    if (row.match.test(hay)) return row.label;
  }
  // slug pattern: industry-studio-… or industry-store-…
  const m = slug.match(/^([a-z0-9-]+?)-(?:studio|store|site)-/i);
  if (m?.[1]) return m[1].replace(/-/g, '_');
  return 'general';
}

export function formatIndustryLabel(slug: string): string {
  return slug
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
