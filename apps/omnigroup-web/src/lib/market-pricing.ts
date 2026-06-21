/** Sync with atina-platform/atina/src/modules/billing/lib/market-pricing.ts */

export const CATEGORY_MARKET_INDEX: Record<string, number> = {
  admin_support: 0.82,
  writing_translation: 0.85,
  customer_service: 0.86,
  community_moderation: 0.88,
  photography: 0.9,
  audio_music: 0.94,
  creator_services: 0.98,
  education_training: 1.0,
  localization: 1.02,
  design_creative: 1.06,
  marketing: 1.1,
  sales: 1.08,
  hr_recruiting: 1.12,
  ecommerce: 1.14,
  video_animation: 1.16,
  product_project_management: 1.22,
  business_consulting: 1.26,
  real_estate_services: 1.2,
  development_it: 1.3,
  ai_data: 1.38,
  finance_accounting: 1.32,
  legal_services: 1.4,
  engineering_architecture: 1.34,
  engineering_science: 1.32,
  web3: 1.42,
  healthcare: 1.45,
  legal: 1.38,
  retail: 0.88,
  hospitality: 0.86,
  construction: 1.05,
  education: 1.0,
  finance: 1.3,
  logistics: 1.15,
  beauty: 0.9,
  fitness: 0.92,
  agriculture: 0.95,
  automotive: 1.08,
  'real-estate': 1.2,
  manufacturing: 1.18,
  technology: 1.28,
  media: 1.05,
  nonprofit: 0.72,
  government: 1.5,
  energy: 1.48,
  travel: 1.02,
  professional: 1.15,
  entertainment: 1.08,
  home_services: 0.9,
  pets: 0.88,
  industrial: 1.35,
};

export function getCategoryMarketIndex(categorySlug?: string | null): number {
  if (!categorySlug?.trim()) return 1;
  const key = categorySlug.trim().toLowerCase().replace(/\s+/g, '_');
  return CATEGORY_MARKET_INDEX[key] ?? 1;
}

export function formatMarketIndexLabel(index: number): string {
  if (index >= 1.25) return 'Premium market';
  if (index >= 1.05) return 'Above average';
  if (index >= 0.95) return 'Average market';
  return 'Accessible segment';
}
