/** Capability clusters for OMI recommendations. Mirrors web industry-sku-map. */

export type CapabilityCluster =
  | 'regulated_ops'
  | 'local_services'
  | 'commerce'
  | 'growth'
  | 'professional'
  | 'product_ops'
  | 'technology'
  | 'creative';

export type ClusterSku = { id: string; why: string };

export const CLUSTER_SKUS: Record<CapabilityCluster, ClusterSku[]> = {
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
    { id: 'website-ecommerce', why: 'Live HYBRID storefront with catalog, cart, and orders — not full merchant inventory/tax.' },
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
  hospitality: 'local_services',
  restaurant: 'local_services',
  restaurants: 'local_services',
  beauty: 'local_services',
  fitness: 'local_services',
  automotive: 'local_services',
  home_services: 'local_services',
  pets: 'local_services',
  travel: 'local_services',
  photography: 'local_services',
  customer_service: 'local_services',
  ecommerce: 'commerce',
  retail: 'commerce',
  marketing: 'growth',
  sales: 'growth',
  real_estate: 'growth',
  'real-estate': 'growth',
  legal: 'professional',
  legal_services: 'professional',
  finance: 'professional',
  finance_accounting: 'professional',
  education: 'professional',
  education_training: 'professional',
  professional: 'professional',
  nonprofit: 'professional',
  admin_support: 'professional',
  community_moderation: 'professional',
  business_consulting: 'professional',
  hr_recruiting: 'professional',
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
  creator_services: 'growth',
  real_estate_services: 'growth',
};

export const FORBIDDEN_SKU_CLUSTERS: Record<string, CapabilityCluster[]> = {
  'website-ecommerce': ['regulated_ops', 'professional', 'technology', 'creative', 'product_ops', 'local_services'],
  'lead-gen-retainer': ['regulated_ops'],
};

export const INDUSTRY_CATEGORY_KEYS = Object.keys(CATEGORY_CLUSTER);

export function capabilityClusterFor(category: string): CapabilityCluster {
  const raw = category.trim().toLowerCase();
  const key = raw.replace(/-/g, '_');
  return CATEGORY_CLUSTER[raw] ?? CATEGORY_CLUSTER[key] ?? 'professional';
}

export function resolveIndustryCategory(slugOrCategory: string): string | undefined {
  const raw = slugOrCategory.trim().toLowerCase();
  if (!raw) return undefined;
  if (CATEGORY_CLUSTER[raw] || CATEGORY_CLUSTER[raw.replace(/-/g, '_')]) {
    return CATEGORY_CLUSTER[raw] ? raw : raw.replace(/-/g, '_');
  }
  const keys = INDUSTRY_CATEGORY_KEYS.slice().sort((a, b) => b.length - a.length);
  for (const key of keys) {
    const prefix = key.replace(/_/g, '-');
    if (raw === prefix || raw.startsWith(`${prefix}-`) || raw.replace(/-/g, '_').startsWith(`${key}_`)) {
      return key;
    }
  }
  return undefined;
}

export function inferClusterFromText(text: string): CapabilityCluster | null {
  const t = text.toLowerCase();
  if (/\b(restaurant|cafe|hotel|salon|clinic front desk|reservation|bookings?)\b/.test(t)) {
    return 'local_services';
  }
  if (/\b(hospital|hospice|clinic|healthcare|medical|pharma|dentist|dental|orthodont)\b/.test(t)) {
    return 'regulated_ops';
  }
  if (/\b(automotive|mechanic|auto shop|car repair|dealership)\b/.test(t)) return 'local_services';
  if (/\b(shopify|woocommerce|storefront|ecommerce|e-commerce|shop)\b/.test(t)) return 'commerce';
  if (/\b(ads|outbound|agency|realtor|real estate|lead[- ]gen|lead generation)\b/.test(t)) {
    return 'growth';
  }
  if (/\b(api|saas|software|developer|webhook)\b/.test(t)) return 'technology';
  if (/\b(factory|warehouse|construction|logistics|farm)\b/.test(t)) return 'product_ops';
  if (/\b(studio|video|design|podcast)\b/.test(t)) return 'creative';
  if (/\b(law|legal|account|accountant|accounting|bookkeep|school|nonprofit)\b/.test(t)) {
    return 'professional';
  }
  return null;
}
