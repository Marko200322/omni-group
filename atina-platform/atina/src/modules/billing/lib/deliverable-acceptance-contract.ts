/**
 * Acceptance contract — catalog description → machine-checkable criteria.
 * Used by fulfillment-quality-checklist and E2E tests.
 */

import { DELIVERABLE_CATALOG, type DeliverableDefinition } from './deliverable-catalog';

export type AcceptanceCriterion = {
  id: string;
  label: string;
  /** If false, failure blocks release. */
  required: boolean;
};

export type DeliverableAcceptanceContract = {
  deliverableId: string;
  name: string;
  description: string;
  billing: DeliverableDefinition['billing'];
  criteria: AcceptanceCriterion[];
};

const CR = {
  status: { id: 'status_completed', label: 'Fulfillment completed', required: true },
  pdf: { id: 'pdf_artifact', label: 'Downloadable PDF deliverable', required: true },
  publicUrl: { id: 'public_url', label: 'Published live site URL', required: true },
  liveProbe: { id: 'live_http_probe', label: 'Live HTTP probe after publish', required: true },
  noOmniChrome: {
    id: 'no_omni_chrome',
    label: 'Client brand — no Omni chrome / System Admin title',
    required: true,
  },
  docSubstance: {
    id: 'doc_substance',
    label: 'Substantial PDF + markdown body (anti-stub)',
    required: true,
  },
  setupProject: { id: 'setup_project', label: 'Setup project scaffold', required: true },
  portalModules: {
    id: 'portal_modules',
    label: 'Portal entitlements (notifications + billing via user_modules/org)',
    required: true,
  },
  migrationTemplate: { id: 'migration_template', label: 'Substantial CRM migration template (CSV)', required: true },
  trainingOutline: { id: 'training_outline', label: 'Training & onboarding outline', required: true },
  crmBootstrap: {
    id: 'crm_bootstrap',
    label: 'CRM pipeline seeded with labeled demo/industry leads',
    required: true,
  },
  productionManifest: {
    id: 'production_manifest',
    label: 'Honest production deploy runbook (SSL/domain not falsely DONE)',
    required: true,
  },
  integrationConfig: { id: 'integration_config', label: 'Integration config JSON + webhooks', required: true },
  supportAutomation: { id: 'support_automation', label: 'Automated support queue + SLA', required: true },
  retainerProject: { id: 'retainer_project', label: 'Retainer project in client workspace', required: true },
  slaPack: { id: 'sla_pack', label: 'SLA / onboarding pack artifact', required: true },
  channelHonesty: {
    id: 'channel_status_honesty',
    label: 'Ads/outreach channels marked CONNECTED or NOT CONNECTED',
    required: true,
  },
  noSimulatedHarvest: {
    id: 'no_simulated_harvest',
    label: 'No simulated/invented live harvest counts',
    required: true,
  },
  supportFaq: {
    id: 'support_faq',
    label: 'Support FAQ seed artifact',
    required: true,
  },
  aiAvatarHonesty: {
    id: 'ai_avatar_honesty',
    label: 'Avatar CONNECTED or CONFIGURATION REQUIRED (honest)',
    required: true,
  },
  businessPages: { id: 'page_count', label: 'Multi-page business site (5+ pages)', required: true },
  businessProject: { id: 'business_site_project', label: 'Product factory project linked', required: true },
  ecommerceCatalog: { id: 'ecommerce_catalog', label: 'E-commerce catalog (4+ products)', required: true },
  ecommerceShop: { id: 'ecommerce_shop_page', label: 'Shop page present on storefront', required: true },
  ecommerceCatalogVisible: {
    id: 'ecommerce_catalog_visible',
    label: 'Catalog visible on shop page',
    required: true,
  },
  ecommerceHonesty: {
    id: 'ecommerce_honesty',
    label: 'Stripe Connect/LIVE disclosed as CONFIGURATION REQUIRED (complete storefront, not HYBRID incomplete)',
    required: true,
  },
  whiteLabelSite: { id: 'white_label_live', label: 'White-label landing published', required: true },
  modulesBootstrap: { id: 'modules_metadata', label: 'Industry modules activated', required: true },
  leadGenKickoff: { id: 'lead_gen_kickoff', label: 'Lead gen pipeline kickoff', required: true },
  aiSupportSetup: { id: 'ai_support_setup', label: 'AI avatar + RAG + meetings provisioned', required: true },
  softwareProject: { id: 'software_project', label: 'Greenfield software project', required: true },
  softwareScaffoldArchive: {
    id: 'software_scaffold_archive',
    label: 'Downloadable software scaffold archive (tar.gz/zip)',
    required: true,
  },
  handoffPdf: { id: 'handoff_pdf', label: 'Software handoff PDF', required: true },
  testGate: { id: 'software_test_gate', label: 'Build/test gate recorded', required: true },
  bundleSteps: {
    id: 'bundle_steps_complete',
    label: 'All bundle child steps completed',
    required: true,
  },
  dualPdf: {
    id: 'dual_pdf_artifacts',
    label: 'Audit + workflow PDFs both delivered',
    required: true,
  },
};

const CONTRACTS: Record<string, DeliverableAcceptanceContract> = {
  'setup-quick': {
    deliverableId: 'setup-quick',
    name: 'Quick setup',
    description: DELIVERABLE_CATALOG[0].description,
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.docSubstance, CR.setupProject, CR.portalModules],
  },
  'setup-full': {
    deliverableId: 'setup-full',
    name: 'Full onboarding',
    description: DELIVERABLE_CATALOG[1].description,
    billing: 'one_time',
    criteria: [
      CR.status,
      CR.pdf,
      CR.docSubstance,
      CR.setupProject,
      CR.crmBootstrap,
      CR.migrationTemplate,
      CR.trainingOutline,
      CR.modulesBootstrap,
    ],
  },
  'setup-custom': {
    deliverableId: 'setup-custom',
    name: 'Custom deploy',
    description: DELIVERABLE_CATALOG[2].description,
    billing: 'one_time',
    criteria: [
      CR.status,
      CR.pdf,
      CR.docSubstance,
      CR.setupProject,
      CR.crmBootstrap,
      CR.productionManifest,
      CR.modulesBootstrap,
    ],
  },
  audit: {
    deliverableId: 'audit',
    name: 'Technical audit',
    description: DELIVERABLE_CATALOG[3].description,
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.docSubstance],
  },
  integration: {
    deliverableId: 'integration',
    name: 'Custom integration',
    description: DELIVERABLE_CATALOG[4].description,
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.docSubstance, CR.integrationConfig],
  },
  'workflow-design': {
    deliverableId: 'workflow-design',
    name: 'Workflow design',
    description: DELIVERABLE_CATALOG[5].description,
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.docSubstance],
  },
  'support-priority': {
    deliverableId: 'support-priority',
    name: 'Priority support',
    description: DELIVERABLE_CATALOG[6].description,
    billing: 'monthly',
    criteria: [CR.status, CR.pdf, CR.supportAutomation, CR.retainerProject, CR.slaPack, CR.supportFaq],
  },
  'support-dedicated': {
    deliverableId: 'support-dedicated',
    name: 'Dedicated support',
    description: DELIVERABLE_CATALOG[7].description,
    billing: 'monthly',
    criteria: [CR.status, CR.pdf, CR.supportAutomation, CR.retainerProject, CR.slaPack, CR.supportFaq],
  },
  landing: {
    deliverableId: 'landing',
    name: 'Landing + copy',
    description: DELIVERABLE_CATALOG[8].description,
    billing: 'one_time',
    criteria: [CR.status, CR.publicUrl, CR.liveProbe, CR.noOmniChrome, CR.pdf],
  },
  'website-business': {
    deliverableId: 'website-business',
    name: 'Business website',
    description: DELIVERABLE_CATALOG[9].description,
    billing: 'one_time',
    criteria: [
      CR.status,
      CR.publicUrl,
      CR.liveProbe,
      CR.noOmniChrome,
      CR.businessProject,
      CR.businessPages,
      CR.pdf,
    ],
  },
  'website-ecommerce': {
    deliverableId: 'website-ecommerce',
    name: 'E-commerce storefront',
    description: DELIVERABLE_CATALOG[10].description,
    billing: 'one_time',
    criteria: [
      CR.status,
      CR.publicUrl,
      CR.liveProbe,
      CR.noOmniChrome,
      CR.ecommerceCatalog,
      CR.ecommerceShop,
      CR.ecommerceCatalogVisible,
      CR.ecommerceHonesty,
      CR.pdf,
    ],
  },
  'white-label-setup': {
    deliverableId: 'white-label-setup',
    name: 'White-label packaging',
    description: DELIVERABLE_CATALOG[11].description,
    billing: 'one_time',
    criteria: [
      CR.status,
      CR.pdf,
      CR.docSubstance,
      CR.publicUrl,
      CR.whiteLabelSite,
      CR.liveProbe,
      CR.noOmniChrome,
    ],
  },
  'sales-enablement': {
    deliverableId: 'sales-enablement',
    name: 'Sales enablement',
    description: DELIVERABLE_CATALOG[12].description,
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.docSubstance],
  },
  'vertical-package': {
    deliverableId: 'vertical-package',
    name: 'Vertical solution',
    description: DELIVERABLE_CATALOG[13].description,
    billing: 'monthly',
    criteria: [
      CR.status,
      CR.pdf,
      CR.docSubstance,
      CR.crmBootstrap,
      CR.modulesBootstrap,
      CR.retainerProject,
      CR.slaPack,
    ],
  },
  'lead-gen-retainer': {
    deliverableId: 'lead-gen-retainer',
    name: 'Lead gen retainer',
    description: DELIVERABLE_CATALOG[14].description,
    billing: 'monthly',
    criteria: [
      CR.status,
      CR.pdf,
      CR.leadGenKickoff,
      CR.crmBootstrap,
      CR.modulesBootstrap,
      CR.retainerProject,
      CR.slaPack,
      CR.channelHonesty,
      CR.noSimulatedHarvest,
    ],
  },
  'ai-support-retainer': {
    deliverableId: 'ai-support-retainer',
    name: 'AI support retainer',
    description: DELIVERABLE_CATALOG[15].description,
    billing: 'monthly',
    criteria: [
      CR.status,
      CR.pdf,
      CR.aiSupportSetup,
      CR.modulesBootstrap,
      CR.retainerProject,
      CR.slaPack,
      CR.aiAvatarHonesty,
    ],
  },
  'custom-software': {
    deliverableId: 'custom-software',
    name: 'Custom software',
    description: DELIVERABLE_CATALOG.find((d) => d.id === 'custom-software')!.description,
    billing: 'one_time',
    criteria: [
      CR.status,
      CR.softwareProject,
      CR.softwareScaffoldArchive,
      CR.handoffPdf,
      CR.docSubstance,
      CR.testGate,
    ],
  },
  'bundle-portal-presence': {
    deliverableId: 'bundle-portal-presence',
    name: 'Portal + presence bundle',
    description: DELIVERABLE_CATALOG.find((d) => d.id === 'bundle-portal-presence')!.description,
    billing: 'one_time',
    criteria: [
      CR.status,
      CR.pdf,
      CR.setupProject,
      CR.portalModules,
      CR.publicUrl,
      CR.liveProbe,
      CR.noOmniChrome,
      CR.bundleSteps,
    ],
  },
  'bundle-sales-launch': {
    deliverableId: 'bundle-sales-launch',
    name: 'Sales launch bundle',
    description: DELIVERABLE_CATALOG.find((d) => d.id === 'bundle-sales-launch')!.description,
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.publicUrl, CR.liveProbe, CR.noOmniChrome, CR.bundleSteps],
  },
  'bundle-ops-clarity': {
    deliverableId: 'bundle-ops-clarity',
    name: 'Ops clarity bundle',
    description: DELIVERABLE_CATALOG.find((d) => d.id === 'bundle-ops-clarity')!.description,
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.docSubstance, CR.dualPdf, CR.bundleSteps],
  },
};

export function getAcceptanceContract(deliverableId: string): DeliverableAcceptanceContract | null {
  return CONTRACTS[deliverableId.trim()] ?? null;
}

export function listAcceptanceContracts(): DeliverableAcceptanceContract[] {
  return DELIVERABLE_CATALOG.map((d) => CONTRACTS[d.id]).filter(Boolean);
}

export function allDeliverableIdsInContract(): string[] {
  return DELIVERABLE_CATALOG.map((d) => d.id);
}
