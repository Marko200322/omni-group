/**
 * Capability-based industry → SKU recommendations.
 * One SKU serves many niches; the set must match the category's operating work.
 * Prices stay on the public catalog. Do not dump the full catalog onto a landing.
 */

export type CapabilityCluster =
  | 'regulated_ops'
  | 'local_services'
  | 'commerce'
  | 'growth'
  | 'professional'
  | 'product_ops'
  | 'technology'
  | 'creative';

export type RecommendedSku = {
  id: string;
  why: string;
};

const CLUSTER_SKUS: Record<CapabilityCluster, RecommendedSku[]> = {
  regulated_ops: [
    { id: 'audit', why: 'Document risks, access, and a 90-day plan before anything is automated.' },
    { id: 'workflow-design', why: 'Map intake, review, and handoff so work is auditable.' },
    { id: 'setup-quick', why: 'Give staff and clients one portal for files, billing, and status.' },
    { id: 'support-priority', why: 'A person answers inside a 24h target after the workspace is live.' },
  ],
  local_services: [
    { id: 'landing', why: 'A live page so bookings and inquiries have one public URL.' },
    { id: 'setup-quick', why: 'Portal for appointments, invoices, and follow-up notes.' },
    { id: 'sales-enablement', why: 'Scripts and FAQ the front desk can reuse.' },
    { id: 'bundle-portal-presence', why: 'Portal plus landing in one checkout when both are needed.' },
  ],
  commerce: [
    { id: 'website-ecommerce', why: 'Demo storefront and checkout notes — not a live merchant shop.' },
    { id: 'landing', why: 'A campaign page while the catalog is still being defined.' },
    { id: 'setup-quick', why: 'Portal for orders, files, and billing status.' },
    { id: 'sales-enablement', why: 'Offer language and FAQ for the catalog you already sell.' },
  ],
  growth: [
    { id: 'landing', why: 'A public page so campaigns have a place to land.' },
    { id: 'lead-gen-retainer', why: 'CRM workspace and monthly report; live outbound needs the disclosed stack.' },
    { id: 'sales-enablement', why: 'Scripts and hooks aligned to the niche offer.' },
    { id: 'bundle-sales-launch', why: 'Landing plus sales kit in one purchase.' },
  ],
  professional: [
    { id: 'setup-quick', why: 'Client portal for matters, files, and invoices.' },
    { id: 'audit', why: 'A written view of stack risk before you add more tools.' },
    { id: 'workflow-design', why: 'SOPs for intake, review, and delivery.' },
    { id: 'bundle-ops-clarity', why: 'Audit and workflow plan together when both are needed.' },
  ],
  product_ops: [
    { id: 'workflow-design', why: 'Job travelers, RFIs, and handoffs need one written flow.' },
    { id: 'audit', why: 'See where status and invoices currently split.' },
    { id: 'setup-full', why: 'CRM and automation modules for the ops team.' },
    { id: 'integration', why: 'A documented map for the tools you already run — not live wiring.' },
  ],
  technology: [
    { id: 'audit', why: 'Stack, env, and delivery-risk report first.' },
    { id: 'integration', why: 'Webhook and auth notes your engineer can follow.' },
    { id: 'setup-full', why: 'Portal, CRM seed, and training outline.' },
    { id: 'custom-software', why: 'Starter API + SPA kit when they need a codebase, not a finished product.' },
  ],
  creative: [
    { id: 'landing', why: 'A live page for the current offer or reel.' },
    { id: 'setup-quick', why: 'Portal so briefs, files, and invoices stay together.' },
    { id: 'workflow-design', why: 'Revision rounds and approvals mapped as steps.' },
    { id: 'sales-enablement', why: 'FAQ and close language for retainers.' },
  ],
};

const CATEGORY_CLUSTER: Record<string, CapabilityCluster> = {
  healthcare: 'regulated_ops',
  government: 'regulated_ops',
  energy: 'regulated_ops',
  industrial: 'regulated_ops',
  legal: 'professional',
  legal_services: 'professional',
  finance: 'professional',
  finance_accounting: 'professional',
  professional: 'professional',
  education: 'professional',
  education_training: 'professional',
  nonprofit: 'professional',
  beauty: 'local_services',
  fitness: 'local_services',
  hospitality: 'local_services',
  automotive: 'local_services',
  home_services: 'local_services',
  pets: 'local_services',
  travel: 'local_services',
  photography: 'local_services',
  ecommerce: 'commerce',
  retail: 'commerce',
  marketing: 'growth',
  sales: 'growth',
  creator_services: 'growth',
  real_estate_services: 'growth',
  'real-estate': 'growth',
  real_estate: 'growth',
  construction: 'product_ops',
  manufacturing: 'product_ops',
  logistics: 'product_ops',
  agriculture: 'product_ops',
  engineering_architecture: 'product_ops',
  engineering_science: 'product_ops',
  development_it: 'technology',
  ai_data: 'technology',
  technology: 'technology',
  web3: 'technology',
  product_project_management: 'technology',
  design_creative: 'creative',
  video_animation: 'creative',
  audio_music: 'creative',
  writing_translation: 'creative',
  localization: 'creative',
  media: 'creative',
  entertainment: 'creative',
  admin_support: 'professional',
  customer_service: 'local_services',
  community_moderation: 'professional',
  business_consulting: 'professional',
  hr_recruiting: 'professional',
};

export function normalizeIndustryCategory(category: string): string {
  return category.trim().toLowerCase().replace(/-/g, '_');
}

export function capabilityClusterFor(category: string): CapabilityCluster {
  const raw = category.trim().toLowerCase();
  const key = normalizeIndustryCategory(category);
  return CATEGORY_CLUSTER[raw] ?? CATEGORY_CLUSTER[key] ?? 'professional';
}

export function recommendSkusForIndustry(category: string): RecommendedSku[] {
  return CLUSTER_SKUS[capabilityClusterFor(category)];
}

export function recommendSkuIdsForIndustry(category: string): string[] {
  return recommendSkusForIndustry(category).map((row) => row.id);
}

/** True when a delivery pack is dumping the whole catalog instead of a capability set. */
export function isCatalogDump(ids: string[]): boolean {
  return ids.length > 8;
}

export const FORBIDDEN_SKU_CLUSTERS: Record<string, CapabilityCluster[]> = {
  'website-ecommerce': ['regulated_ops', 'professional', 'technology', 'creative', 'product_ops', 'local_services'],
  'lead-gen-retainer': ['regulated_ops'],
};
