/**
 * Acceptance contract — catalog description → machine-checkable criteria.
 * Used by fulfillment-quality-checklist and E2E tests.
 */

import { DELIVERABLE_CATALOG, getDeliverable, type DeliverableDefinition } from './deliverable-catalog';

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
  setupProject: { id: 'setup_project', label: 'Setup project scaffold', required: true },
  portalModules: { id: 'portal_modules', label: 'Portal modules (notifications, billing)', required: true },
  migrationTemplate: { id: 'migration_template', label: 'CRM migration template (CSV)', required: true },
  trainingOutline: { id: 'training_outline', label: 'Training & onboarding outline', required: true },
  crmBootstrap: { id: 'crm_bootstrap', label: 'CRM pipeline seeded with leads', required: true },
  productionManifest: { id: 'production_manifest', label: 'Production deploy manifest', required: true },
  integrationConfig: { id: 'integration_config', label: 'Integration config JSON + webhooks', required: true },
  supportAutomation: { id: 'support_automation', label: 'Automated support queue + SLA', required: true },
  businessPages: { id: 'page_count', label: 'Multi-page business site (5+ pages)', required: true },
  businessProject: { id: 'business_site_project', label: 'Product factory project linked', required: true },
  ecommerceCatalog: { id: 'ecommerce_catalog', label: 'E-commerce catalog (4+ products)', required: true },
  whiteLabelSite: { id: 'white_label_live', label: 'White-label landing published', required: true },
  modulesBootstrap: { id: 'modules_metadata', label: 'Industry modules activated', required: true },
  leadGenKickoff: { id: 'lead_gen_kickoff', label: 'Lead gen pipeline kickoff', required: true },
  aiSupportSetup: { id: 'ai_support_setup', label: 'AI avatar + RAG + meetings provisioned', required: true },
  softwareProject: { id: 'software_project', label: 'Greenfield software project', required: true },
  handoffPdf: { id: 'handoff_pdf', label: 'Software handoff PDF', required: true },
  testGate: { id: 'software_test_gate', label: 'Build/test gate recorded', required: true },
};

function descOf(id: string): string {
  return getDeliverable(id)?.description ?? '';
}

const CONTRACTS: Record<string, DeliverableAcceptanceContract> = {
  'setup-quick': {
    deliverableId: 'setup-quick',
    name: 'Quick setup',
    description: descOf('setup-quick'),
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.setupProject, CR.portalModules],
  },
  'setup-full': {
    deliverableId: 'setup-full',
    name: 'Full onboarding',
    description: descOf('setup-full'),
    billing: 'one_time',
    criteria: [
      CR.status,
      CR.pdf,
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
    description: descOf('setup-custom'),
    billing: 'one_time',
    criteria: [
      CR.status,
      CR.pdf,
      CR.setupProject,
      CR.crmBootstrap,
      CR.productionManifest,
      CR.modulesBootstrap,
    ],
  },
  audit: {
    deliverableId: 'audit',
    name: 'Technical audit',
    description: descOf('audit'),
    billing: 'one_time',
    criteria: [CR.status, CR.pdf],
  },
  'ai-pilot': {
    deliverableId: 'ai-pilot',
    name: 'AI pilot (30 days)',
    description: descOf('ai-pilot'),
    billing: 'one_time',
    criteria: [CR.status, CR.pdf],
  },
  'billing-automation': {
    deliverableId: 'billing-automation',
    name: 'Invoicing & billing automation',
    description: descOf('billing-automation'),
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.integrationConfig],
  },
  'compliance-pack': {
    deliverableId: 'compliance-pack',
    name: 'GDPR & e-invoice compliance pack',
    description: descOf('compliance-pack'),
    billing: 'one_time',
    criteria: [CR.status, CR.pdf],
  },
  integration: {
    deliverableId: 'integration',
    name: 'Custom integration',
    description: descOf('integration'),
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.integrationConfig],
  },
  'workflow-design': {
    deliverableId: 'workflow-design',
    name: 'Workflow design',
    description: descOf('workflow-design'),
    billing: 'one_time',
    criteria: [CR.status, CR.pdf],
  },
  'support-priority': {
    deliverableId: 'support-priority',
    name: 'Priority support',
    description: descOf('support-priority'),
    billing: 'monthly',
    criteria: [CR.status, CR.pdf, CR.supportAutomation],
  },
  'support-dedicated': {
    deliverableId: 'support-dedicated',
    name: 'Dedicated support',
    description: descOf('support-dedicated'),
    billing: 'monthly',
    criteria: [CR.status, CR.pdf, CR.supportAutomation],
  },
  'website-care': {
    deliverableId: 'website-care',
    name: 'Website care plan',
    description: descOf('website-care'),
    billing: 'monthly',
    criteria: [CR.status, CR.pdf, CR.supportAutomation],
  },
  landing: {
    deliverableId: 'landing',
    name: 'Landing + copy',
    description: descOf('landing'),
    billing: 'one_time',
    criteria: [CR.status, CR.publicUrl],
  },
  'website-business': {
    deliverableId: 'website-business',
    name: 'Business website',
    description: descOf('website-business'),
    billing: 'one_time',
    criteria: [CR.status, CR.publicUrl, CR.businessProject, CR.businessPages],
  },
  'website-ecommerce': {
    deliverableId: 'website-ecommerce',
    name: 'E-commerce website',
    description: descOf('website-ecommerce'),
    billing: 'one_time',
    criteria: [CR.status, CR.publicUrl, CR.ecommerceCatalog],
  },
  'white-label-setup': {
    deliverableId: 'white-label-setup',
    name: 'White-label packaging',
    description: descOf('white-label-setup'),
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.whiteLabelSite],
  },
  'sales-enablement': {
    deliverableId: 'sales-enablement',
    name: 'Sales enablement',
    description: descOf('sales-enablement'),
    billing: 'one_time',
    criteria: [CR.status, CR.pdf],
  },
  'lead-list': {
    deliverableId: 'lead-list',
    name: 'Verified lead list',
    description: descOf('lead-list'),
    billing: 'one_time',
    criteria: [CR.status, CR.pdf, CR.leadGenKickoff],
  },
  'seo-geo-retainer': {
    deliverableId: 'seo-geo-retainer',
    name: 'SEO + AI search visibility',
    description: descOf('seo-geo-retainer'),
    billing: 'monthly',
    criteria: [CR.status, CR.pdf],
  },
  'video-pipeline-retainer': {
    deliverableId: 'video-pipeline-retainer',
    name: 'Content & video pipeline',
    description: descOf('video-pipeline-retainer'),
    billing: 'monthly',
    criteria: [CR.status, CR.pdf],
  },
  'vertical-package': {
    deliverableId: 'vertical-package',
    name: 'Vertical solution',
    description: descOf('vertical-package'),
    billing: 'monthly',
    criteria: [CR.status, CR.pdf, CR.crmBootstrap, CR.modulesBootstrap],
  },
  'lead-gen-retainer': {
    deliverableId: 'lead-gen-retainer',
    name: 'Lead gen retainer',
    description: descOf('lead-gen-retainer'),
    billing: 'monthly',
    criteria: [CR.status, CR.pdf, CR.leadGenKickoff, CR.crmBootstrap, CR.modulesBootstrap],
  },
  'ai-support-retainer': {
    deliverableId: 'ai-support-retainer',
    name: 'AI support retainer',
    description: descOf('ai-support-retainer'),
    billing: 'monthly',
    criteria: [CR.status, CR.pdf, CR.aiSupportSetup, CR.modulesBootstrap],
  },
  'ai-receptionist': {
    deliverableId: 'ai-receptionist',
    name: 'AI receptionist + booking',
    description: descOf('ai-receptionist'),
    billing: 'monthly',
    criteria: [CR.status, CR.pdf, CR.aiSupportSetup, CR.modulesBootstrap],
  },
  'custom-software': {
    deliverableId: 'custom-software',
    name: 'Custom software',
    description: descOf('custom-software'),
    billing: 'one_time',
    criteria: [CR.status, CR.softwareProject, CR.handoffPdf, CR.testGate],
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
