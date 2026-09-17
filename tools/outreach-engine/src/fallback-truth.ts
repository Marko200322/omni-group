/**
 * Offline/fallback source-of-truth snapshot aligned with deliverable-catalog.ts (M6 anchors).
 * Live pipeline MUST refresh from API; this is for local validation & bootstrapping.
 */
export const FALLBACK_SOURCE_OF_TRUTH = {
  fetchedAt: '2026-09-05T00:00:00.000Z',
  brandName: 'Omni Group Tech' as const,
  publicSiteUrl: 'https://omnigrouptech.com',
  checkoutBaseUrl: 'https://omnigrouptech.com/pricing',
  modules: [
    {
      id: 'atina' as const,
      name: 'Atina',
      tagline: 'API & SaaS core',
      description: 'Auth, billing, health, public plan catalog.',
    },
    {
      id: 'astra' as const,
      name: 'Astra',
      tagline: 'Automation & workflows',
      description: 'Chain templates, Forge pipelines, execution stats.',
    },
    {
      id: 'titan' as const,
      name: 'Titan',
      tagline: 'Operations & integrations',
      description: 'Aggregators, queues, backups, admin gates, production ops.',
    },
  ],
  packages: [
    { id: 'setup-quick', name: 'Quick setup', description: 'Portal, login, payments, contact — live in 5–7 days.', billing: 'one_time' as const, category: 'implementation', anchorEur: 549, includes: ['Portal modules', 'Setup PDF'], excludes: ['Custom domain DNS control transfer'] },
    { id: 'setup-full', name: 'Full onboarding', description: 'CRM, automations, migration, training, 30 days of support.', billing: 'one_time' as const, category: 'implementation', anchorEur: 1290 },
    { id: 'setup-custom', name: 'Custom deploy', description: 'Production: domain, SSL, backup, monitoring, SLA.', billing: 'one_time' as const, category: 'implementation', anchorEur: 3490 },
    { id: 'audit', name: 'Technical audit', description: 'Security review, stack assessment, migration plan, and ROI estimate.', billing: 'one_time' as const, category: 'consulting', anchorEur: 590 },
    { id: 'integration', name: 'Custom integration', description: 'API, AI, email, payments — connected to your existing tools.', billing: 'one_time' as const, category: 'consulting', anchorEur: 1190 },
    { id: 'workflow-design', name: 'Workflow design', description: 'Process mapping into automations and SOP documentation.', billing: 'one_time' as const, category: 'consulting', anchorEur: 690 },
    { id: 'support-priority', name: 'Priority support', description: 'Response within 24h, minor changes included.', billing: 'monthly' as const, category: 'retainer', anchorEur: 249 },
    { id: 'support-dedicated', name: 'Dedicated support', description: 'Slack channel, monthly health check.', billing: 'monthly' as const, category: 'retainer', anchorEur: 690 },
    { id: 'landing', name: 'Landing + copy', description: 'Professional landing page and sales copy for your niche.', billing: 'one_time' as const, category: 'growth', anchorEur: 990 },
    { id: 'website-business', name: 'Business website', description: 'Multi-page site with services, pricing, and contact.', billing: 'one_time' as const, category: 'growth', anchorEur: 1990 },
    { id: 'website-ecommerce', name: 'E-commerce website', description: 'Demo storefront + checkout docs — not a full merchant Stripe shop.', billing: 'one_time' as const, category: 'growth', anchorEur: 3490 },
    { id: 'white-label-setup', name: 'White-label packaging', description: 'Branding, domain, and sales materials.', billing: 'one_time' as const, category: 'growth', anchorEur: 1790 },
    { id: 'sales-enablement', name: 'Sales enablement', description: 'Demo scripts, FAQ, and onboarding for your team.', billing: 'one_time' as const, category: 'growth', anchorEur: 890 },
    { id: 'vertical-package', name: 'Vertical solution', description: 'CRM + automations + AI support tailored to your industry.', billing: 'monthly' as const, category: 'vertical', anchorEur: 299, modules: ['crm', 'automation', 'support-avatar', 'billing'] },
    { id: 'lead-gen-retainer', name: 'Lead gen retainer', description: 'Leads, outreach, and CRM pipeline every month.', billing: 'monthly' as const, category: 'vertical', anchorEur: 499, modules: ['client-hunter', 'titanis', 'outreach', 'scraper'] },
    { id: 'ai-support-retainer', name: 'AI support retainer', description: 'AI avatar + video meetings for your clients.', billing: 'monthly' as const, category: 'vertical', anchorEur: 349, modules: ['support-avatar', 'video-meetings', 'ai-rag'] },
    { id: 'custom-software', name: 'Software starter kit', description: 'Starter Node API + SPA scaffold + tests — not unlimited custom build.', billing: 'one_time' as const, category: 'implementation', anchorEur: 4900 },
  ],
  terms: {
    allowedGuarantees: [
      'Published package scope on checkout',
      'Priority support response within 24h (support-priority package only)',
    ],
    forbiddenClaims: [
      '100% money-back guarantee',
      'Guaranteed ROI / lead volume',
      'Unlimited custom software',
      'Full merchant Stripe shop included in website-ecommerce',
      'Invented discounts or private payment links',
    ],
    refundPolicySummary: 'See https://omnigrouptech.com/legal/refund',
    slaSummary: 'SLA language only as stated on the purchased package page.',
    disclaimerFooter:
      '— Omni Group Tech · Packages & pricing: https://omnigrouptech.com/pricing · Terms: https://omnigrouptech.com/legal/terms · This is not a binding offer; checkout confirms scope.',
  },
  allowedFeaturePhrases: [
    'client portal',
    'login',
    'billing',
    'CRM',
    'automations',
    'API integration',
    'AI support avatar',
    'video meetings',
    'landing page',
    'workflow design',
    'technical audit',
    'lead gen',
    'white-label',
    'SSL',
    'monitoring',
    'onboarding',
  ],
};

export type FallbackSourceOfTruth = typeof FALLBACK_SOURCE_OF_TRUTH;
