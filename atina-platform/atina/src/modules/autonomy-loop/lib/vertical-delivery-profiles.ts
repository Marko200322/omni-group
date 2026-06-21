/**
 * Freelance category delivery blueprints — redosled #1–25.
 * Svaka pod-industrija nasleđuje profil kategorije + subtype keywords.
 */

import { LEGACY_SMB_INDUSTRY_CATEGORIES, getIndustryCategory, type PricingTier } from '../../billing/lib/category-pricing';
import { normalizeCategorySlug } from '../../../shared/industry/industry-catalog';

export type WorkflowStepDef = {
  step: string;
  moduleSlug: string;
  action: string;
  config?: Record<string, unknown>;
};

export type CategoryDeliveryProfile = {
  slug: string;
  nameSr: string;
  primaryDeliverables: string[];
  coreModules: string[];
  workflowSteps: WorkflowStepDef[];
  researchFocus: string[];
  outreachHooks: string[];
  qualityGates: string[];
  marketIntensityDefault: number;
  valuePropTemplate: string;
  baseKeywords: string[];
};

const STANDARD_QUALITY_GATES = [
  'Research complete (TAM + competition in research_data)',
  'Artifacts generated (module, landing, workflow, outreach, quality pack)',
  'Dynamic pricing quote valid for verticalSlug',
  'CRM pipeline and lead source defined',
  'Outreach draft reviewed before send (domain warmup)',
  'Smoke test / owner sign-off before client delivery',
];

function profile(
  slug: string,
  nameSr: string,
  partial: Omit<
    CategoryDeliveryProfile,
    'slug' | 'nameSr' | 'qualityGates' | 'valuePropTemplate' | 'baseKeywords'
  > & {
    valuePropTemplate?: string;
    baseKeywords?: string[];
    qualityGates?: string[];
  }
): CategoryDeliveryProfile {
  return {
    slug,
    nameSr,
    qualityGates: partial.qualityGates ?? STANDARD_QUALITY_GATES,
    valuePropTemplate:
      partial.valuePropTemplate ??
      'End-to-end delivery for {niche}: CRM, automations, lead gen, and AI support — no platform resale, only finished output.',
    baseKeywords: partial.baseKeywords ?? [slug.replace(/_/g, ' '), 'freelance', 'automation', 'crm'],
    ...partial,
  };
}

/** Redom #1–25 — freelance platform katalog. */
export const FREELANCE_CATEGORY_ROLLOUT_ORDER = [
  'development_it',
  'ai_data',
  'design_creative',
  'writing_translation',
  'marketing',
  'sales',
  'admin_support',
  'customer_service',
  'business_consulting',
  'finance_accounting',
  'legal_services',
  'ecommerce',
  'engineering_architecture',
  'video_animation',
  'audio_music',
  'education_training',
  'hr_recruiting',
  'photography',
  'product_project_management',
  'engineering_science',
  'web3',
  'localization',
  'community_moderation',
  'creator_services',
  'real_estate_services',
] as const;

/** Redom #26–50 — legacy SMB vertikale (default delivery profil). */
export const LEGACY_SMB_CATEGORY_ROLLOUT_ORDER = LEGACY_SMB_INDUSTRY_CATEGORIES.map(
  (c) => c.slug
) as readonly string[];

/** Pun rollout: freelance + legacy SMB (50 kategorija). */
export const FULL_INDUSTRY_ROLLOUT_ORDER = [
  ...FREELANCE_CATEGORY_ROLLOUT_ORDER,
  ...LEGACY_SMB_CATEGORY_ROLLOUT_ORDER,
] as const;

export type RolloutSegment = 'all' | 'freelance' | 'legacy_smb';

export function parseRolloutSegment(raw: string | undefined | null): RolloutSegment {
  const v = (raw ?? 'freelance').trim().toLowerCase();
  if (v === 'freelance' || v === 'online') return 'freelance';
  if (v === 'legacy' || v === 'legacy_smb' || v === 'smb') return 'legacy_smb';
  if (v === 'all' || v === 'full') return 'all';
  return 'freelance';
}

/** Aktivni rollout red — po defaultu samo online poslovi (freelance). */
export function resolveRolloutOrder(segment: RolloutSegment): readonly string[] {
  switch (segment) {
    case 'freelance':
      return FREELANCE_CATEGORY_ROLLOUT_ORDER;
    case 'legacy_smb':
      return LEGACY_SMB_CATEGORY_ROLLOUT_ORDER;
    default:
      return FULL_INDUSTRY_ROLLOUT_ORDER;
  }
}

export type FreelanceCategorySlug = (typeof FREELANCE_CATEGORY_ROLLOUT_ORDER)[number];

export const CATEGORY_DELIVERY_PROFILES: Record<string, CategoryDeliveryProfile> = {
  development_it: profile('development_it', 'Development & IT', {
    primaryDeliverables: ['setup-full', 'integration', 'vertical-package', 'audit'],
    coreModules: ['craftor', 'validator', 'crm', 'automation', 'client-hunter'],
    marketIntensityDefault: 62,
    researchFocus: [
      'freelance dev market rates',
      'tech stack demand',
      'client onboarding pain points',
      'API integration opportunities',
    ],
    outreachHooks: [
      'Automate client onboarding and quoting',
      'CRM + pipeline for dev projects',
      'Less admin, more billable hours',
    ],
    baseKeywords: ['software development', 'web development', 'dev agency', 'freelance developer'],
    workflowSteps: [
      { step: 'Discover dev leads', moduleSlug: 'client-hunter', action: 'hunt', config: { mode: 'hunt' } },
      { step: 'Validate stack fit', moduleSlug: 'validator', action: 'validate' },
      { step: 'Score leads', moduleSlug: 'lead-scoring', action: 'score' },
      { step: 'CRM capture', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Proposal draft', moduleSlug: 'craftor', action: 'proposal' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'send' },
      { step: 'Follow-up', moduleSlug: 'follow-up-automation', action: 'sequence' },
    ],
  }),

  ai_data: profile('ai_data', 'AI & Data', {
    primaryDeliverables: ['integration', 'vertical-package', 'ai-support-retainer', 'workflow-design'],
    coreModules: ['ai-rag', 'craftor', 'client-hunter', 'crm', 'analytics'],
    marketIntensityDefault: 68,
    researchFocus: ['LLM adoption SMB', 'data pipeline demand', 'AI automation ROI', 'RAG use cases'],
    outreachHooks: ['AI agent for your niche', 'RAG over client documentation', 'Automated research and reporting'],
    baseKeywords: ['artificial intelligence', 'machine learning', 'data science', 'LLM'],
    workflowSteps: [
      { step: 'Market discover', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'AI memory seed', moduleSlug: 'ai-memory', action: 'remember' },
      { step: 'Lead score', moduleSlug: 'lead-scoring', action: 'score' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'sequence' },
      { step: 'Analytics', moduleSlug: 'analytics', action: 'track' },
    ],
  }),

  design_creative: profile('design_creative', 'Dizajn & kreativa', {
    primaryDeliverables: ['landing', 'vertical-package', 'setup-full', 'sales-enablement'],
    coreModules: ['craftor', 'template-engine', 'crm', 'deal-offer', 'client-hunter'],
    marketIntensityDefault: 55,
    researchFocus: ['design freelance demand', 'portfolio conversion', 'brand identity market'],
    outreachHooks: ['Faster proposals and follow-up', 'Landing + CRM for design studios', 'Automate the client feedback loop'],
    baseKeywords: ['graphic design', 'UI UX', 'creative agency', 'brand identity'],
    workflowSteps: [
      { step: 'Discover clients', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'Template proposal', moduleSlug: 'template-engine', action: 'render' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Deal offer', moduleSlug: 'deal-offer', action: 'draft' },
      { step: 'Follow-up', moduleSlug: 'follow-up', action: 'schedule' },
    ],
  }),

  writing_translation: profile('writing_translation', 'Pisanje & prevod', {
    primaryDeliverables: ['landing', 'lead-gen-retainer', 'vertical-package', 'setup-quick'],
    coreModules: ['template-engine', 'craftor', 'crm', 'outreach', 'client-hunter'],
    marketIntensityDefault: 48,
    researchFocus: ['content marketing demand', 'translation market rates', 'SEO writing volume'],
    outreachHooks: ['Pipeline for content projects', 'Automated briefing and follow-up', 'Lead gen for the copywriting niche'],
    baseKeywords: ['copywriting', 'content writing', 'translation', 'SEO writing'],
    workflowSteps: [
      { step: 'Hunt content leads', moduleSlug: 'client-hunter', action: 'hunt' },
      { step: 'Craftor brief', moduleSlug: 'craftor', action: 'outreach' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'send' },
      { step: 'Follow-up', moduleSlug: 'follow-up-automation', action: 'sequence' },
    ],
  }),

  marketing: profile('marketing', 'Marketing', {
    primaryDeliverables: ['lead-gen-retainer', 'landing', 'vertical-package', 'sales-enablement'],
    coreModules: ['client-hunter', 'titanis', 'outreach', 'crm', 'analytics'],
    marketIntensityDefault: 65,
    researchFocus: ['digital marketing spend', 'SEO/PPC competition', 'agency churn', 'lead gen pricing'],
    outreachHooks: [
      'Lead gen + outreach on autopilot',
      'CRM for marketing agencies',
      'Clear ROI reporting for clients',
    ],
    baseKeywords: ['digital marketing', 'SEO', 'PPC', 'growth marketing'],
    workflowSteps: [
      { step: 'Proxy warm-up', moduleSlug: 'proxy-rotation', action: 'rotate' },
      { step: 'Client hunt', moduleSlug: 'client-hunter', action: 'hunt' },
      { step: 'Lead scoring', moduleSlug: 'lead-scoring', action: 'score' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'sequence' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Analytics', moduleSlug: 'analytics', action: 'track' },
    ],
  }),

  sales: profile('sales', 'Prodaja', {
    primaryDeliverables: ['lead-gen-retainer', 'sales-enablement', 'vertical-package', 'setup-full'],
    coreModules: ['titanis', 'client-hunter', 'outreach', 'crm', 'follow-up-automation'],
    marketIntensityDefault: 70,
    researchFocus: ['B2B lead gen', 'SDR outsourcing', 'cold email benchmarks', 'CRM adoption'],
    outreachHooks: ['Qualified leads + CRM sync', 'Cold email sequences by niche', 'Pipeline without manual copy-paste'],
    baseKeywords: ['lead generation', 'sales development', 'BDR', 'appointment setting'],
    workflowSteps: [
      { step: 'Titanis hunt', moduleSlug: 'titanis', action: 'lead-hunt' },
      { step: 'Score', moduleSlug: 'lead-scoring', action: 'score' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'send' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Follow-up', moduleSlug: 'follow-up-automation', action: 'sequence' },
    ],
  }),

  admin_support: profile('admin_support', 'Admin podrška', {
    primaryDeliverables: ['setup-quick', 'vertical-package', 'support-priority', 'workflow-design'],
    coreModules: ['automation', 'crm', 'tasks', 'notifications', 'client-hunter'],
    marketIntensityDefault: 42,
    researchFocus: ['virtual assistant market', 'SMB admin outsourcing', 'workflow automation'],
    outreachHooks: ['Automate repetitive VA tasks', 'CRM + task queue for your team', 'Fewer data entry errors'],
    baseKeywords: ['virtual assistant', 'admin support', 'data entry', 'executive assistant'],
    workflowSteps: [
      { step: 'Discover', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'Automation', moduleSlug: 'automation', action: 'run' },
      { step: 'Tasks', moduleSlug: 'tasks', action: 'create' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Notify', moduleSlug: 'notifications', action: 'send' },
    ],
  }),

  customer_service: profile('customer_service', 'Korisnička podrška', {
    primaryDeliverables: ['ai-support-retainer', 'vertical-package', 'support-dedicated', 'setup-full'],
    coreModules: ['support-avatar', 'ai-rag', 'crm', 'follow-up', 'notifications'],
    marketIntensityDefault: 52,
    researchFocus: ['support outsourcing', 'chatbot ROI', 'CSAT benchmarks', 'helpdesk SaaS'],
    outreachHooks: ['AI support avatar for your niche', 'RAG over FAQ and ticket history', '24/7 first response'],
    baseKeywords: ['customer support', 'help desk', 'customer success', 'live chat'],
    workflowSteps: [
      { step: 'CRM contact', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'AI memory FAQ', moduleSlug: 'ai-memory', action: 'remember' },
      { step: 'Follow-up', moduleSlug: 'follow-up', action: 'schedule' },
      { step: 'Notify', moduleSlug: 'notifications', action: 'send' },
    ],
  }),

  business_consulting: profile('business_consulting', 'Biznis konsalting', {
    primaryDeliverables: ['audit', 'workflow-design', 'vertical-package', 'sales-enablement'],
    coreModules: ['craftor', 'analytics', 'crm', 'contracts', 'deal-offer'],
    marketIntensityDefault: 58,
    researchFocus: ['consulting market size', 'SMB digital transformation', 'strategy consulting fees'],
    outreachHooks: ['Audit + roadmap delivery', 'CRM for consulting pipeline', 'Automated proposals and contracts'],
    baseKeywords: ['business consulting', 'management consulting', 'strategy', 'operations'],
    workflowSteps: [
      { step: 'Discover', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'Audit artifact', moduleSlug: 'craftor', action: 'proposal' },
      { step: 'Deal offer', moduleSlug: 'deal-offer', action: 'draft' },
      { step: 'Contract', moduleSlug: 'contracts', action: 'create' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
    ],
  }),

  finance_accounting: profile('finance_accounting', 'Finansije & računovodstvo', {
    primaryDeliverables: ['audit', 'vertical-package', 'setup-full', 'support-priority'],
    coreModules: ['billing', 'sistem-naplate', 'crm', 'compliance', 'notifications'],
    marketIntensityDefault: 60,
    researchFocus: ['accounting SaaS', 'bookkeeping automation', 'tax compliance tools'],
    outreachHooks: ['Billing + invoicing workflow', 'Compliance-ready audit trail', 'Less manual invoice follow-up'],
    baseKeywords: ['accounting', 'bookkeeping', 'payroll', 'tax preparation'],
    workflowSteps: [
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Billing setup', moduleSlug: 'billing', action: 'invoice' },
      { step: 'Compliance record', moduleSlug: 'compliance', action: 'record' },
      { step: 'Notify payment', moduleSlug: 'notifications', action: 'send' },
    ],
  }),

  legal_services: profile('legal_services', 'Pravne usluge', {
    primaryDeliverables: ['audit', 'vertical-package', 'setup-full', 'workflow-design'],
    coreModules: ['contracts', 'digital-signature', 'crm', 'compliance', 'template-engine'],
    marketIntensityDefault: 55,
    researchFocus: ['legal tech adoption', 'contract automation', 'GDPR compliance demand'],
    outreachHooks: ['Contract automation + e-sign', 'GDPR-ready documentation', 'CRM for law firm pipeline'],
    baseKeywords: ['legal services', 'contract review', 'compliance', 'GDPR'],
    workflowSteps: [
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Contract draft', moduleSlug: 'contracts', action: 'create' },
      { step: 'Digital sign', moduleSlug: 'digital-signature', action: 'request' },
      { step: 'Compliance', moduleSlug: 'compliance', action: 'record' },
    ],
  }),

  ecommerce: profile('ecommerce', 'E-commerce', {
    primaryDeliverables: ['setup-full', 'landing', 'lead-gen-retainer', 'vertical-package'],
    coreModules: ['client-hunter', 'scraper', 'crm', 'billing', 'analytics'],
    marketIntensityDefault: 64,
    researchFocus: ['ecommerce growth', 'marketplace competition', 'conversion optimization', 'DTC trends'],
    outreachHooks: ['Product research + listing automation', 'CRM for ecommerce brands', 'Lead gen for agencies'],
    baseKeywords: ['ecommerce', 'shopify', 'amazon FBA', 'dropshipping'],
    workflowSteps: [
      { step: 'Scrape competitors', moduleSlug: 'scraper', action: 'run' },
      { step: 'Hunt brands', moduleSlug: 'client-hunter', action: 'hunt' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'send' },
      { step: 'Analytics', moduleSlug: 'analytics', action: 'track' },
    ],
  }),

  engineering_architecture: profile('engineering_architecture', 'Inženjering & arhitektura', {
    primaryDeliverables: ['audit', 'workflow-design', 'vertical-package', 'setup-custom'],
    coreModules: ['crm', 'contracts', 'template-engine', 'client-hunter', 'deal-offer'],
    marketIntensityDefault: 56,
    researchFocus: ['AEC software market', 'BIM adoption', 'engineering services demand'],
    outreachHooks: ['Proposal + CRM for engineering studios', 'Automate tender follow-up', 'Project pipeline visibility'],
    baseKeywords: ['architecture', 'CAD', 'engineering', 'BIM'],
    workflowSteps: [
      { step: 'Discover RFP leads', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'Template proposal', moduleSlug: 'template-engine', action: 'render' },
      { step: 'Deal offer', moduleSlug: 'deal-offer', action: 'draft' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
    ],
  }),

  video_animation: profile('video_animation', 'Video & animacija', {
    primaryDeliverables: ['landing', 'vertical-package', 'sales-enablement', 'setup-full'],
    coreModules: ['craftor', 'omnitube', 'crm', 'deal-offer', 'client-hunter'],
    marketIntensityDefault: 54,
    researchFocus: ['video production market', 'short-form content demand', 'YouTube creator economy'],
    outreachHooks: ['Pipeline for video projects', 'Landing + booking for studios', 'Automated client onboarding'],
    baseKeywords: ['video editing', 'motion graphics', 'animation', 'video production'],
    workflowSteps: [
      { step: 'Discover creators', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'Craftor proposal', moduleSlug: 'craftor', action: 'proposal' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Deal offer', moduleSlug: 'deal-offer', action: 'draft' },
    ],
  }),

  audio_music: profile('audio_music', 'Audio & muzika', {
    primaryDeliverables: ['landing', 'vertical-package', 'setup-full', 'support-priority'],
    coreModules: ['craftor', 'crm', 'deal-offer', 'template-engine', 'client-hunter'],
    marketIntensityDefault: 50,
    researchFocus: ['podcast production market', 'voice over demand', 'audio freelance rates'],
    outreachHooks: ['CRM for audio studios', 'Proposal templates by project', 'Follow-up on pending mixes'],
    baseKeywords: ['voice over', 'podcast', 'music production', 'audio editing'],
    workflowSteps: [
      { step: 'Discover', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'Template brief', moduleSlug: 'template-engine', action: 'render' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Follow-up', moduleSlug: 'follow-up', action: 'schedule' },
    ],
  }),

  education_training: profile('education_training', 'Obrazovanje & trening', {
    primaryDeliverables: ['landing', 'vertical-package', 'ai-support-retainer', 'setup-full'],
    coreModules: ['crm', 'automation', 'ai-rag', 'template-engine', 'notifications'],
    marketIntensityDefault: 52,
    researchFocus: ['EdTech market', 'online tutoring demand', 'corporate training spend'],
    outreachHooks: ['Student CRM + onboarding', 'AI tutor FAQ for your course', 'Automated enrollment follow-up'],
    baseKeywords: ['online tutoring', 'course creation', 'corporate training', 'EdTech'],
    workflowSteps: [
      { step: 'CRM lead', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'AI memory curriculum', moduleSlug: 'ai-memory', action: 'remember' },
      { step: 'Automation enroll', moduleSlug: 'automation', action: 'run' },
      { step: 'Notify', moduleSlug: 'notifications', action: 'send' },
    ],
  }),

  hr_recruiting: profile('hr_recruiting', 'HR & regrutacija', {
    primaryDeliverables: ['lead-gen-retainer', 'vertical-package', 'workflow-design', 'setup-full'],
    coreModules: ['client-hunter', 'titanis', 'crm', 'outreach', 'lead-scoring'],
    marketIntensityDefault: 58,
    researchFocus: ['recruiting agency market', 'LinkedIn sourcing tools', 'HR tech stack'],
    outreachHooks: ['Candidate pipeline CRM', 'Outreach to hiring managers', 'Scrape + score talent leads'],
    baseKeywords: ['recruitment', 'talent acquisition', 'HR consulting', 'LinkedIn recruiting'],
    workflowSteps: [
      { step: 'Titanis hunt', moduleSlug: 'titanis', action: 'lead-hunt' },
      { step: 'Score candidates', moduleSlug: 'lead-scoring', action: 'score' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'sequence' },
    ],
  }),

  photography: profile('photography', 'Fotografija', {
    primaryDeliverables: ['landing', 'vertical-package', 'setup-quick', 'sales-enablement'],
    coreModules: ['crm', 'deal-offer', 'template-engine', 'client-hunter', 'billing'],
    marketIntensityDefault: 45,
    researchFocus: ['photography freelance rates', 'real estate photo market', 'ecommerce product photo'],
    outreachHooks: ['Booking + CRM for photographers', 'Automated shoot quotes', 'Follow-up on galleries'],
    baseKeywords: ['photography', 'photo editing', 'retouching', 'product photography'],
    workflowSteps: [
      { step: 'Discover', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'Deal offer', moduleSlug: 'deal-offer', action: 'draft' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Billing', moduleSlug: 'billing', action: 'invoice' },
    ],
  }),

  product_project_management: profile('product_project_management', 'Proizvod & projekti', {
    primaryDeliverables: ['workflow-design', 'audit', 'vertical-package', 'setup-full'],
    coreModules: ['tasks', 'automation', 'crm', 'analytics', 'workflow-chain'],
    marketIntensityDefault: 57,
    researchFocus: ['PM tool market', 'Agile coaching demand', 'product ops trends'],
    outreachHooks: ['Workflow automation for PM teams', 'CRM + task sync', 'Reporting without manual Excel'],
    baseKeywords: ['project management', 'product management', 'scrum', 'agile'],
    workflowSteps: [
      { step: 'Workflow chain', moduleSlug: 'workflow-chain', action: 'run' },
      { step: 'Tasks', moduleSlug: 'tasks', action: 'create' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Analytics', moduleSlug: 'analytics', action: 'track' },
    ],
  }),

  engineering_science: profile('engineering_science', 'Inženjering & nauka', {
    primaryDeliverables: ['audit', 'integration', 'vertical-package', 'workflow-design'],
    coreModules: ['validator', 'analytics', 'crm', 'compliance', 'template-engine'],
    marketIntensityDefault: 54,
    researchFocus: ['research services market', 'lab automation', 'scientific SaaS'],
    outreachHooks: ['Data pipeline + compliance', 'CRM for research consultancies', 'Automated reporting'],
    baseKeywords: ['scientific research', 'biotechnology', 'statistics', 'data analysis'],
    workflowSteps: [
      { step: 'Validate data', moduleSlug: 'validator', action: 'validate' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Compliance', moduleSlug: 'compliance', action: 'record' },
      { step: 'Analytics', moduleSlug: 'analytics', action: 'track' },
    ],
  }),

  web3: profile('web3', 'Web3', {
    primaryDeliverables: ['audit', 'integration', 'vertical-package', 'setup-custom'],
    coreModules: ['validator', 'craftor', 'crm', 'compliance', 'client-hunter'],
    marketIntensityDefault: 60,
    researchFocus: ['Web3 dev demand', 'smart contract audit market', 'DeFi compliance'],
    outreachHooks: ['Security-first delivery pack', 'CRM for crypto consultancies', 'Compliance documentation'],
    baseKeywords: ['web3', 'smart contracts', 'DeFi', 'NFT'],
    workflowSteps: [
      { step: 'Discover', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'Validator pass', moduleSlug: 'validator', action: 'validate' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Compliance', moduleSlug: 'compliance', action: 'record' },
    ],
  }),

  localization: profile('localization', 'Lokalizacija', {
    primaryDeliverables: ['workflow-design', 'vertical-package', 'setup-full', 'landing'],
    coreModules: ['template-engine', 'crm', 'automation', 'client-hunter', 'outreach'],
    marketIntensityDefault: 50,
    researchFocus: ['localization market', 'multilingual SEO demand', 'app localization rates'],
    outreachHooks: ['TM + workflow for translation teams', 'CRM for LSP pipeline', 'Automated QA checklist'],
    baseKeywords: ['localization', 'translation', 'multilingual SEO', 'i18n'],
    workflowSteps: [
      { step: 'Template glossary', moduleSlug: 'template-engine', action: 'render' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Automation QA', moduleSlug: 'automation', action: 'run' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'send' },
    ],
  }),

  community_moderation: profile('community_moderation', 'Community & moderacija', {
    primaryDeliverables: ['ai-support-retainer', 'vertical-package', 'support-priority', 'setup-full'],
    coreModules: ['notifications', 'crm', 'automation', 'ai-rag', 'analytics'],
    marketIntensityDefault: 48,
    researchFocus: ['community management market', 'Discord/Telegram mod tools', 'creator community growth'],
    outreachHooks: ['Moderation playbook + AI FAQ', 'CRM for community clients', 'Escalation alerting'],
    baseKeywords: ['community management', 'Discord', 'Telegram', 'moderation'],
    workflowSteps: [
      { step: 'AI memory rules', moduleSlug: 'ai-memory', action: 'remember' },
      { step: 'Automation alerts', moduleSlug: 'automation', action: 'run' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Notify', moduleSlug: 'notifications', action: 'send' },
    ],
  }),

  creator_services: profile('creator_services', 'Creator usluge', {
    primaryDeliverables: ['landing', 'lead-gen-retainer', 'vertical-package', 'sales-enablement'],
    coreModules: ['client-hunter', 'craftor', 'crm', 'outreach', 'analytics'],
    marketIntensityDefault: 62,
    researchFocus: ['creator economy', 'YouTube/TikTok management', 'newsletter monetization'],
    outreachHooks: ['Pipeline for brand deals', 'Landing + media kit automation', 'Outreach to sponsors'],
    baseKeywords: ['YouTube', 'TikTok', 'creator', 'influencer', 'newsletter'],
    workflowSteps: [
      { step: 'Hunt sponsors', moduleSlug: 'client-hunter', action: 'hunt' },
      { step: 'Craftor pitch', moduleSlug: 'craftor', action: 'outreach' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'send' },
      { step: 'Analytics', moduleSlug: 'analytics', action: 'track' },
    ],
  }),

  real_estate_services: profile('real_estate_services', 'Nekretnine usluge', {
    primaryDeliverables: ['lead-gen-retainer', 'vertical-package', 'landing', 'setup-full'],
    coreModules: ['client-hunter', 'crm', 'outreach', 'template-engine', 'billing'],
    marketIntensityDefault: 58,
    researchFocus: ['real estate lead gen', 'property tech', 'VA services for agents'],
    outreachHooks: ['Lead gen for agents', 'CRM + follow-up for buyers and sellers', 'Automated listing outreach'],
    baseKeywords: ['real estate', 'property', 'lead generation', 'real estate CRM'],
    workflowSteps: [
      { step: 'Hunt listings', moduleSlug: 'client-hunter', action: 'hunt' },
      { step: 'Score leads', moduleSlug: 'lead-scoring', action: 'score' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'sequence' },
      { step: 'Billing', moduleSlug: 'billing', action: 'invoice' },
    ],
  }),
};

function legacyIntensityForTier(tier: PricingTier): number {
  switch (tier) {
    case 'regulated':
      return 48;
    case 'premium':
      return 58;
    case 'budget':
      return 44;
    case 'nonprofit':
      return 40;
    default:
      return 52;
  }
}

function legacySmbProfile(meta: { slug: string; nameSr: string; tier: PricingTier }): CategoryDeliveryProfile {
  const label = meta.nameSr;
  return profile(meta.slug, label, {
    primaryDeliverables: ['vertical-package', 'setup-full', 'lead-gen-retainer', 'landing'],
    coreModules: ['crm', 'client-hunter', 'outreach', 'automation', 'billing'],
    marketIntensityDefault: legacyIntensityForTier(meta.tier),
    researchFocus: [
      `${label} SMB market`,
      'local lead generation',
      'digital adoption pain points',
      'compliance and onboarding',
    ],
    outreachHooks: [
      `Turnkey delivery for ${label} — no platform resale`,
      'CRM + automations tailored to your niche',
      'Lead gen and follow-up in one package',
    ],
    baseKeywords: [label.toLowerCase(), 'SMB', 'local business', 'automation'],
    workflowSteps: [
      { step: 'Discover local leads', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'Score leads', moduleSlug: 'lead-scoring', action: 'score' },
      { step: 'CRM capture', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Outreach sequence', moduleSlug: 'outreach', action: 'sequence' },
      { step: 'Follow-up', moduleSlug: 'follow-up-automation', action: 'run' },
      { step: 'Billing', moduleSlug: 'billing', action: 'invoice' },
    ],
  });
}

/** Legacy SMB profili (#26–50) — generisani po tier-u. */
export const LEGACY_SMB_DELIVERY_PROFILES: Record<string, CategoryDeliveryProfile> = Object.fromEntries(
  LEGACY_SMB_INDUSTRY_CATEGORIES.map((meta) => [meta.slug, legacySmbProfile(meta)] as const)
);

export const DEFAULT_DELIVERY_PROFILE: CategoryDeliveryProfile = profile(
  'professional',
  'Profesionalne usluge',
  {
    primaryDeliverables: ['vertical-package', 'setup-full', 'lead-gen-retainer'],
    coreModules: ['crm', 'client-hunter', 'outreach', 'automation', 'billing'],
    marketIntensityDefault: 50,
    researchFocus: ['SMB software adoption', 'vertical SaaS trends'],
    outreachHooks: ['Turnkey delivery — no platform resale', 'CRM + automations by niche'],
    workflowSteps: [
      { step: 'Discover', moduleSlug: 'client-hunter', action: 'discover' },
      { step: 'CRM', moduleSlug: 'crm', action: 'create-contact' },
      { step: 'Outreach', moduleSlug: 'outreach', action: 'send' },
    ],
  }
);

export function getCategoryDeliveryProfile(category: string): CategoryDeliveryProfile {
  const key = normalizeCategorySlug(category);
  if (CATEGORY_DELIVERY_PROFILES[key]) return CATEGORY_DELIVERY_PROFILES[key];
  if (LEGACY_SMB_DELIVERY_PROFILES[key]) return LEGACY_SMB_DELIVERY_PROFILES[key];
  const meta = getIndustryCategory(key);
  return {
    ...DEFAULT_DELIVERY_PROFILE,
    slug: key,
    nameSr: meta?.nameSr ?? DEFAULT_DELIVERY_PROFILE.nameSr,
  };
}

export function listCategoryDeliveryProfiles(): CategoryDeliveryProfile[] {
  return [
    ...FREELANCE_CATEGORY_ROLLOUT_ORDER.map((slug) => CATEGORY_DELIVERY_PROFILES[slug]),
    ...LEGACY_SMB_CATEGORY_ROLLOUT_ORDER.map((slug) => LEGACY_SMB_DELIVERY_PROFILES[slug]),
  ].filter(Boolean);
}
