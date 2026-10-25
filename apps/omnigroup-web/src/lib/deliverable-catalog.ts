/** Client-side mirror of Atina deliverable catalog (keep in sync). */
import { getPackageAnchorEur, getPackageDeliverySpec } from './package-delivery-spec';
import { buildThousandPackageCatalog, parseIndustryPackageId } from './thousand-package-catalog';
import type { DeliverableBilling, DeliverableDefinition, ResourceProfile } from './deliverable-catalog-types';

export type { DeliverableBilling, DeliverableDefinition, ResourceProfile };

const DELIVERABLE_CATALOG_RAW: DeliverableDefinition[] = [
  { id: 'setup-quick', name: 'Quick setup', nameSr: 'Brzo podešavanje', description: 'PRODUCT/OPS: portal entitlements (notifications + billing + CRM view + tasks), welcome onboarding tasks, setup PDF — automations NOT CONNECTED.', billing: 'one_time', category: 'implementation', anchorEur: 690, resources: { aiTokensK: 8, scraperRuns: 0, infraHours: 3, supportHours: 2, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'setup-full', name: 'Full onboarding', nameSr: 'Pun onboarding', description: 'Labeled CRM demo/industry samples, automation module (not live connectors), migration CSV, training, 30-day support.', billing: 'one_time', category: 'implementation', anchorEur: 1590, resources: { aiTokensK: 45, scraperRuns: 2, infraHours: 12, supportHours: 8, storageGbMonth: 2, deployComplexity: 3 } },
  { id: 'setup-custom', name: 'Production runbook', nameSr: 'Production runbook', description: 'Client-executable production deploy runbook (DNS/SSL/backup/monitoring PENDING) + CRM seed — you deploy; not remote go-live.', bestFor: 'ops teams that run production setup from a documented pack', billing: 'one_time', category: 'implementation', anchorEur: 1290, resources: { aiTokensK: 20, scraperRuns: 0, infraHours: 24, supportHours: 12, storageGbMonth: 10, deployComplexity: 5 } },
  { id: 'audit', name: 'Technical audit', nameSr: 'Tehnički audit', description: 'SERVICE + DOCS: workspace project, kickoff ticket, Billing invoice, commercial pack — PDF audit accompanies the engagement (not PDF-only).', billing: 'one_time', category: 'consulting', anchorEur: 890, resources: { aiTokensK: 25, scraperRuns: 1, infraHours: 4, supportHours: 4, storageGbMonth: 0, deployComplexity: 1 } },
  { id: 'integration', name: 'Custom integration', nameSr: 'Integracija po meri', description: 'SERVICE + DOCS + config: kickoff ticket, workspace, integration-config JSON (tools NOT pre-connected) + guide PDF — not a live wired integration.', bestFor: 'teams whose developers will wire APIs from a documented guide', billing: 'one_time', category: 'consulting', anchorEur: 890, resources: { aiTokensK: 30, scraperRuns: 3, infraHours: 8, supportHours: 6, storageGbMonth: 1, deployComplexity: 4 } },
  { id: 'workflow-design', name: 'Workflow design', nameSr: 'Dizajn workflow-a', description: 'SERVICE + DOCS: workspace project, kickoff ticket, invoice + SOP/workflow PDF pack — documents accompany the service engagement.', bestFor: 'operators mapping processes into SOPs before automation builds', billing: 'one_time', category: 'consulting', anchorEur: 890, resources: { aiTokensK: 35, scraperRuns: 0, infraHours: 6, supportHours: 5, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'support-priority', name: 'Priority support', nameSr: 'Prioritetna podrška', description: 'PRODUCT/SERVICE: ticket queue (24h), AI auto-triage/solve on tickets via RAG, kickoff ticket, FAQ seed, health-check PDF — solves problems, not report-only.', billing: 'monthly', category: 'retainer', anchorEur: 299, resources: { aiTokensK: 5, scraperRuns: 0, infraHours: 1, supportHours: 3, storageGbMonth: 0, deployComplexity: 1 } },
  { id: 'support-dedicated', name: 'Dedicated support', nameSr: 'Dedicated podrška', description: 'PRODUCT/SERVICE: ticket queue (8h), AI auto-triage/solve + human escalation, kickoff ticket, monthly health-check, video-meetings. Slack only when webhook configured.', billing: 'monthly', category: 'retainer', anchorEur: 790, resources: { aiTokensK: 10, scraperRuns: 0, infraHours: 2, supportHours: 8, storageGbMonth: 1, deployComplexity: 1 } },
  { id: 'landing', name: 'Landing + copy', nameSr: 'Landing + copy', description: 'Professional landing page and sales copy for your niche.', billing: 'one_time', category: 'growth', anchorEur: 1290, resources: { aiTokensK: 40, scraperRuns: 2, infraHours: 5, supportHours: 3, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'website-business', name: 'Business website', nameSr: 'Poslovni sajt (5–10 str)', description: 'Multi-page site with services, pricing, and contact — hosted at /sites/{slug}.', billing: 'one_time', category: 'growth', anchorEur: 2290, resources: { aiTokensK: 55, scraperRuns: 2, infraHours: 12, supportHours: 6, storageGbMonth: 1, deployComplexity: 3 } },
  { id: 'website-ecommerce', name: 'E-commerce storefront', nameSr: 'E-commerce prodavnica', description: 'Complete sellable shop: industry catalog, cart, inventory, tax/shipping settings, bank-transfer orders — Stripe LIVE/Connect is EXTERNAL CONFIGURATION REQUIRED.', billing: 'one_time', category: 'growth', anchorEur: 2790, resources: { aiTokensK: 70, scraperRuns: 4, infraHours: 18, supportHours: 8, storageGbMonth: 3, deployComplexity: 4 } },
  { id: 'white-label-setup', name: 'White-label packaging', nameSr: 'White-label pakovanje', description: 'Brand pack PDF plus live partner landing for resale.', bestFor: 'agencies and partners reselling under their own brand', billing: 'one_time', category: 'growth', anchorEur: 1590, resources: { aiTokensK: 25, scraperRuns: 0, infraHours: 10, supportHours: 6, storageGbMonth: 2, deployComplexity: 4 } },
  { id: 'sales-enablement', name: 'Sales enablement', nameSr: 'Sales enablement', description: 'SERVICE + DOCS: kickoff ticket, workspace, Billing invoice + sales scripts/FAQ/closing checklist PDF — pack accompanies the engagement.', bestFor: 'sales teams that need scripts, FAQ, and closing checklists', billing: 'one_time', category: 'growth', anchorEur: 890, resources: { aiTokensK: 50, scraperRuns: 1, infraHours: 6, supportHours: 5, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'vertical-package', name: 'Vertical solution', nameSr: 'Vertikalni paket rešenja', description: 'CRM + automations modules seeded for your industry (ads NOT CONNECTED).', bestFor: 'niche businesses wanting industry CRM and automations monthly', billing: 'monthly', category: 'vertical', anchorEur: 349, resources: { aiTokensK: 80, scraperRuns: 8, infraHours: 4, supportHours: 2, storageGbMonth: 3, deployComplexity: 3 }, modules: ['crm', 'automation', 'support-avatar', 'billing'] },
  { id: 'lead-gen-retainer', name: 'Lead gen ops retainer', nameSr: 'Lead gen ops retainer', description: 'COMPLETE ops pack: CRM pipeline, sequences, weekly plan, channel status. Ads/Apollo/LinkedIn: CONFIGURATION REQUIRED / NOT CONNECTED until keys — Titanis leads_generated=0; simulated harvest cannot PASS.', billing: 'monthly', category: 'vertical', anchorEur: 449, resources: { aiTokensK: 60, scraperRuns: 20, infraHours: 2, supportHours: 1, storageGbMonth: 1, deployComplexity: 2 }, modules: ['client-hunter', 'titanis', 'outreach', 'scraper'] },
  { id: 'ai-support-retainer', name: 'AI support retainer', nameSr: 'AI podrška retainer', description: 'COMPLETE AI ops: RAG + ticket queue + AI problem-solver on tickets + FAQ. HeyGen/D-ID avatar: CONFIGURATION REQUIRED until keys.', billing: 'monthly', category: 'vertical', anchorEur: 349, resources: { aiTokensK: 120, scraperRuns: 0, infraHours: 2, supportHours: 2, storageGbMonth: 2, deployComplexity: 2 }, modules: ['support-avatar', 'video-meetings', 'ai-rag'] },
  { id: 'custom-software', name: 'Software starter kit', nameSr: 'Softver starter kit', description: 'Downloadable Node API + SPA scaffold archive (tar.gz) + handoff — not unlimited custom build.', bestFor: 'teams that need a Node/SPA starter codebase, not a finished product', billing: 'one_time', category: 'implementation', anchorEur: 1490, resources: { aiTokensK: 120, scraperRuns: 5, infraHours: 40, supportHours: 16, storageGbMonth: 5, deployComplexity: 5 } },
  { id: 'bundle-portal-presence', name: 'Portal + presence bundle', nameSr: 'Portal + online prisustvo', description: 'Quick client portal plus live niche landing — one checkout.', bestFor: 'teams that want a client portal and niche landing in one purchase', billing: 'one_time', category: 'growth', anchorEur: 1590, resources: { aiTokensK: 48, scraperRuns: 2, infraHours: 8, supportHours: 5, storageGbMonth: 0, deployComplexity: 3 } },
  { id: 'bundle-sales-launch', name: 'Sales launch bundle', nameSr: 'Sales launch paket', description: 'Live landing plus sales enablement PDF and niche hooks.', bestFor: 'go-to-market teams that need a live page plus sales kit together', billing: 'one_time', category: 'growth', anchorEur: 1790, resources: { aiTokensK: 90, scraperRuns: 3, infraHours: 10, supportHours: 6, storageGbMonth: 0, deployComplexity: 3 } },
  { id: 'bundle-ops-clarity', name: 'Ops clarity bundle', nameSr: 'Operativna jasnoća', description: 'SERVICE + DOCS: audit + workflow PDFs with kickoff/service companion + invoice — dual consulting pack, not PDF theater.', bestFor: 'founders who need a tech audit and workflow plan before building', billing: 'one_time', category: 'consulting', anchorEur: 1490, resources: { aiTokensK: 60, scraperRuns: 2, infraHours: 10, supportHours: 8, storageGbMonth: 0, deployComplexity: 2 } },
  { id: 'seo-audit', name: 'SEO audit + 90-day roadmap', nameSr: 'SEO audit + 90-dnevni plan', description: 'SERVICE + DOCS: technical SEO crawl, Core Web Vitals, keyword gaps, competitor benchmark, 90-day roadmap PDF — on-page CMS changes NOT CONNECTED until CMS access granted (not a monthly retainer).', bestFor: 'businesses that need a clear SEO diagnosis and a 90-day improvement roadmap', billing: 'one_time', category: 'consulting', anchorEur: 490, resources: { aiTokensK: 30, scraperRuns: 5, infraHours: 4, supportHours: 3, storageGbMonth: 0, deployComplexity: 1 } },
  { id: 'email-marketing', name: 'Email & SMS marketing', nameSr: 'Email i SMS marketing', description: 'SERVICE + DOCS: campaign strategy, sequence templates, audience segmentation guide, compliance checklist — sending infrastructure CONFIGURATION REQUIRED (Resend/Twilio keys).', bestFor: 'teams that need email/SMS campaign blueprints and sequence templates before wiring send tools', billing: 'monthly', category: 'growth', anchorEur: 349, resources: { aiTokensK: 25, scraperRuns: 0, infraHours: 2, supportHours: 3, storageGbMonth: 1, deployComplexity: 2 }, modules: ['email-campaigns', 'sms-outreach'] },
  { id: 'reputation-management', name: 'Reputation & review automation', nameSr: 'Upravljanje reputacijom', description: 'SERVICE + DOCS: review funnel design, response templates, Google Business profile audit, monitoring dashboard setup — automated review requests CONFIGURATION REQUIRED (Google/Yelp API keys).', bestFor: 'local businesses that want more Google reviews and a system for responding to them', billing: 'monthly', category: 'growth', anchorEur: 249, resources: { aiTokensK: 15, scraperRuns: 2, infraHours: 2, supportHours: 2, storageGbMonth: 0, deployComplexity: 1 }, modules: ['review-automation', 'reputation-monitor'] },
];

function withPhaseAwareCatalog(d: DeliverableDefinition): DeliverableDefinition {
  const baseId = parseIndustryPackageId(d.id)?.baseId ?? d.id;
  const spec = getPackageDeliverySpec(baseId);
  const anchor = getPackageAnchorEur(baseId);
  let item = d;
  if (spec && !d.isIndustryPackage) item = { ...item, description: spec.description };
  if (anchor > 0 && !d.isIndustryPackage) item = { ...item, anchorEur: anchor };
  return item;
}

/** Base fulfillment templates (23) — legacy IDs still resolve. */
export const BASE_DELIVERABLE_CATALOG: DeliverableDefinition[] =
  DELIVERABLE_CATALOG_RAW.map(withPhaseAwareCatalog);

/** Full sellable catalog: 23×50 = 1150 industry-specific packages. */
export const FULL_PACKAGE_CATALOG: DeliverableDefinition[] = buildThousandPackageCatalog(
  BASE_DELIVERABLE_CATALOG,
).map(withPhaseAwareCatalog);

/**
 * @deprecated Prefer FULL_PACKAGE_CATALOG for sellable list.
 * Kept as base templates for checkout shortcuts / legacy links.
 */
export const DELIVERABLE_CATALOG: DeliverableDefinition[] = BASE_DELIVERABLE_CATALOG;

const BY_ID = new Map<string, DeliverableDefinition>();
for (const d of FULL_PACKAGE_CATALOG) BY_ID.set(d.id, d);
for (const d of BASE_DELIVERABLE_CATALOG) BY_ID.set(d.id, d);

export function getDeliverable(id: string) {
  return BY_ID.get(id.trim()) ?? null;
}

export function listFullPackageCatalog(): DeliverableDefinition[] {
  return [...FULL_PACKAGE_CATALOG];
}

export function listBaseDeliverables(): DeliverableDefinition[] {
  return [...BASE_DELIVERABLE_CATALOG];
}

export const DELIVERABLE_CATEGORY_LABELS: Record<DeliverableDefinition['category'], string> = {
  implementation: 'Implementation',
  consulting: 'Consulting',
  retainer: 'Monthly retainer',
  growth: 'Growth & marketing',
  vertical: 'Vertical solutions',
};
