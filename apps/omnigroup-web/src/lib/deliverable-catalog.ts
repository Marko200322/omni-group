/** Client-side mirror of Atina deliverable catalog (keep in sync). */
import { getPackageAnchorEur, getPackageDeliverySpec } from './package-delivery-spec';

export type DeliverableBilling = 'one_time' | 'monthly' | 'yearly';

export type ResourceProfile = {
  aiTokensK: number;
  scraperRuns: number;
  infraHours: number;
  supportHours: number;
  storageGbMonth: number;
  deployComplexity: number;
};

export type DeliverableDefinition = {
  id: string;
  name: string;
  nameSr: string;
  description: string;
  billing: DeliverableBilling;
  category: 'implementation' | 'consulting' | 'retainer' | 'growth' | 'vertical';
  anchorEur: number;
  resources: ResourceProfile;
  modules?: string[];
};

const DELIVERABLE_CATALOG_RAW: DeliverableDefinition[] = [
  { id: 'setup-quick', name: 'Quick setup', nameSr: 'Brzo podešavanje', description: 'Portal, login, payments, contact — live in 5–7 days.', billing: 'one_time', category: 'implementation', anchorEur: 390, resources: { aiTokensK: 8, scraperRuns: 0, infraHours: 3, supportHours: 2, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'setup-full', name: 'Full onboarding', nameSr: 'Pun onboarding', description: 'CRM, automations, migration, training, 30 days of support.', billing: 'one_time', category: 'implementation', anchorEur: 1290, resources: { aiTokensK: 45, scraperRuns: 2, infraHours: 12, supportHours: 8, storageGbMonth: 2, deployComplexity: 3 } },
  { id: 'setup-custom', name: 'Custom deploy', nameSr: 'Custom deploy', description: 'Production: domain, SSL, backup, monitoring, SLA.', billing: 'one_time', category: 'implementation', anchorEur: 3900, resources: { aiTokensK: 20, scraperRuns: 0, infraHours: 24, supportHours: 12, storageGbMonth: 10, deployComplexity: 5 } },
  { id: 'audit', name: 'Technical audit', nameSr: 'Tehnički audit', description: 'Security review, stack assessment, migration plan, and ROI estimate.', billing: 'one_time', category: 'consulting', anchorEur: 690, resources: { aiTokensK: 25, scraperRuns: 1, infraHours: 4, supportHours: 4, storageGbMonth: 0, deployComplexity: 1 } },
  { id: 'integration', name: 'Custom integration', nameSr: 'Integracija po meri', description: 'API, AI, email, payments — connected to your existing tools.', billing: 'one_time', category: 'consulting', anchorEur: 1190, resources: { aiTokensK: 30, scraperRuns: 3, infraHours: 8, supportHours: 6, storageGbMonth: 1, deployComplexity: 4 } },
  { id: 'workflow-design', name: 'Workflow design', nameSr: 'Dizajn workflow-a', description: 'Process mapping into automations and SOP documentation.', billing: 'one_time', category: 'consulting', anchorEur: 790, resources: { aiTokensK: 35, scraperRuns: 0, infraHours: 6, supportHours: 5, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'support-priority', name: 'Priority support', nameSr: 'Prioritetna podrška', description: 'Response within 24h, minor changes included.', billing: 'monthly', category: 'retainer', anchorEur: 199, resources: { aiTokensK: 5, scraperRuns: 0, infraHours: 1, supportHours: 3, storageGbMonth: 0, deployComplexity: 1 } },
  { id: 'support-dedicated', name: 'Dedicated support', nameSr: 'Dedicated podrška', description: 'Slack channel, monthly health check.', billing: 'monthly', category: 'retainer', anchorEur: 490, resources: { aiTokensK: 10, scraperRuns: 0, infraHours: 2, supportHours: 8, storageGbMonth: 1, deployComplexity: 1 } },
  { id: 'landing', name: 'Landing + copy', nameSr: 'Landing + copy', description: 'Professional landing page and sales copy for your niche.', billing: 'one_time', category: 'growth', anchorEur: 890, resources: { aiTokensK: 40, scraperRuns: 2, infraHours: 5, supportHours: 3, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'website-business', name: 'Business website', nameSr: 'Poslovni sajt (5–10 str)', description: 'Multi-page site with services, pricing, and contact — hosted at /sites/{slug}.', billing: 'one_time', category: 'growth', anchorEur: 2490, resources: { aiTokensK: 55, scraperRuns: 2, infraHours: 12, supportHours: 6, storageGbMonth: 1, deployComplexity: 3 } },
  { id: 'website-ecommerce', name: 'E-commerce website', nameSr: 'E-commerce sajt', description: 'Catalog, storefront, and checkout — payment integration and multi-tenant hosting.', billing: 'one_time', category: 'growth', anchorEur: 3900, resources: { aiTokensK: 70, scraperRuns: 4, infraHours: 18, supportHours: 8, storageGbMonth: 3, deployComplexity: 4 } },
  { id: 'white-label-setup', name: 'White-label packaging', nameSr: 'White-label pakovanje', description: 'Branding, domain, and sales materials.', billing: 'one_time', category: 'growth', anchorEur: 1990, resources: { aiTokensK: 25, scraperRuns: 0, infraHours: 10, supportHours: 6, storageGbMonth: 2, deployComplexity: 4 } },
  { id: 'sales-enablement', name: 'Sales enablement', nameSr: 'Sales enablement', description: 'Demo scripts, FAQ, and onboarding for your team.', billing: 'one_time', category: 'growth', anchorEur: 1290, resources: { aiTokensK: 50, scraperRuns: 1, infraHours: 6, supportHours: 5, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'vertical-package', name: 'Vertical solution', nameSr: 'Vertikalni paket rešenja', description: 'CRM + automations + AI support tailored to your industry.', billing: 'monthly', category: 'vertical', anchorEur: 179, resources: { aiTokensK: 80, scraperRuns: 8, infraHours: 4, supportHours: 2, storageGbMonth: 3, deployComplexity: 3 }, modules: ['crm', 'automation', 'support-avatar', 'billing'] },
  { id: 'lead-gen-retainer', name: 'Lead gen retainer', nameSr: 'Lead gen retainer', description: 'Leads, outreach, and CRM pipeline every month.', billing: 'monthly', category: 'vertical', anchorEur: 349, resources: { aiTokensK: 60, scraperRuns: 20, infraHours: 2, supportHours: 1, storageGbMonth: 1, deployComplexity: 2 }, modules: ['client-hunter', 'titanis', 'outreach'] },
  { id: 'ai-support-retainer', name: 'AI support retainer', nameSr: 'AI podrška retainer', description: 'AI avatar + video meetings for your clients.', billing: 'monthly', category: 'vertical', anchorEur: 249, resources: { aiTokensK: 120, scraperRuns: 0, infraHours: 2, supportHours: 2, storageGbMonth: 2, deployComplexity: 2 }, modules: ['support-avatar', 'video-meetings'] },
  { id: 'custom-software', name: 'Custom software', nameSr: 'Softver po meri', description: 'Greenfield application, isolated order, tested before delivery.', billing: 'one_time', category: 'implementation', anchorEur: 4900, resources: { aiTokensK: 120, scraperRuns: 5, infraHours: 40, supportHours: 16, storageGbMonth: 5, deployComplexity: 5 } },
];

function withPhaseAwareCatalog(d: DeliverableDefinition): DeliverableDefinition {
  const spec = getPackageDeliverySpec(d.id);
  const anchor = getPackageAnchorEur(d.id);
  let item = d;
  if (spec) item = { ...item, description: spec.description };
  if (anchor > 0) item = { ...item, anchorEur: anchor };
  return item;
}

export const DELIVERABLE_CATALOG: DeliverableDefinition[] =
  DELIVERABLE_CATALOG_RAW.map(withPhaseAwareCatalog);

export function getDeliverable(id: string) {
  return DELIVERABLE_CATALOG.find((d) => d.id === id) ?? null;
}

export const DELIVERABLE_CATEGORY_LABELS: Record<DeliverableDefinition['category'], string> = {
  implementation: 'Implementation',
  consulting: 'Consulting',
  retainer: 'Monthly retainer',
  growth: 'Growth & marketing',
  vertical: 'Vertical solutions',
};
