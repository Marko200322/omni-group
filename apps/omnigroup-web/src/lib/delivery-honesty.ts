/**
 * Honest delivery contract for public marketing.
 * Do not claim AUTOMATED unless the factory ships the listed artifacts
 * without a human finishing the commercial scope.
 * External Stripe LIVE / ads API / firma / provider keys = CONFIGURATION REQUIRED,
 * not an incomplete-product HYBRID label.
 */
export type AutomationLevel = 'AUTOMATED' | 'SEMI_AUTOMATED' | 'HUMAN_DELIVERY';

export type DeliveryHonesty = {
  deliverableId: string;
  automationLevel: AutomationLevel;
  humanIntervention: string;
  nameMatchesScope: boolean;
  publicNameNote: string;
  label: string;
  /** Shown on the card before Buy now when a dependency changes what ships. */
  prePurchaseWarning?: string;
};

const ROWS: DeliveryHonesty[] = [
  {
    deliverableId: 'setup-quick',
    automationLevel: 'AUTOMATED',
    humanIntervention:
      'None for PRODUCT/OPS portal entitlements (notifications + billing + CRM view + tasks), welcome onboarding tasks, and setup PDF. Automations stay NOT CONNECTED.',
    nameMatchesScope: true,
    publicNameNote: 'CRM DEMO seed and live connectors are Full onboarding / Integration — not Quick setup.',
    label: 'COMPLETE · PRODUCT/OPS portal entitlements',
  },
  {
    deliverableId: 'setup-full',
    automationLevel: 'AUTOMATED',
    humanIntervention:
      'None for the COMPLETE onboarding pack (labeled DEMO CRM samples, entitlements, migration CSV, training outline). External automations stay NOT CONNECTED. Hands-on migration/training calls remain out of scope.',
    nameMatchesScope: true,
    publicNameNote: 'CRM samples are labeled DEMO/industry templates — not live customer data.',
    label: 'COMPLETE onboarding pack · external automations NOT CONNECTED',
  },
  {
    deliverableId: 'setup-custom',
    automationLevel: 'AUTOMATED',
    humanIntervention:
      'None for the COMPLETE deploy runbook pack (JSON checklist, CRM seed, entitlements, enterprise PDF). DNS/SSL/backup/monitoring stay PENDING for client ops — not remote go-live.',
    nameMatchesScope: true,
    publicNameNote: 'Pack is executable documentation; client ops perform go-live.',
    label: 'COMPLETE runbook pack · DNS/SSL PENDING on client',
  },
  {
    deliverableId: 'audit',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for the listed audit PDF pack.',
    nameMatchesScope: true,
    publicNameNote: 'DOCUMENT / consulting deliverable — not a live connected product.',
    label: 'DOCUMENT · consulting PDF pack',
  },
  {
    deliverableId: 'integration',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention:
      'Guide PDF and config map are generated. Live third-party wiring is CONFIGURATION REQUIRED (external credentials).',
    nameMatchesScope: true,
    publicNameNote:
      'DOCUMENT / consulting deliverable (docs + config). Name is “Custom integration”; not a live connected product.',
    label: 'DOCUMENT + config · not live connected',
  },
  {
    deliverableId: 'workflow-design',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for the listed SOP / workflow PDF.',
    nameMatchesScope: true,
    publicNameNote: 'DOCUMENT / consulting deliverable — not a live connected product.',
    label: 'DOCUMENT · consulting PDF pack',
  },
  {
    deliverableId: 'support-priority',
    automationLevel: 'HUMAN_DELIVERY',
    humanIntervention: 'A person answers inside the stated response window.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Human support retainer',
    prePurchaseWarning:
      '24-hour response target for a person — not an automated SLA clock, business-hours timer, or breach dashboard.',
  },
  {
    deliverableId: 'support-dedicated',
    automationLevel: 'HUMAN_DELIVERY',
    humanIntervention: 'A person runs the monthly health-check and the faster response-target queue.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Human support retainer',
    prePurchaseWarning:
      '8-hour response target for a person — not an automated SLA clock, business-hours timer, or breach dashboard.',
  },
  {
    deliverableId: 'landing',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for the listed live landing and niche copy pack.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Automated after payment',
  },
  {
    deliverableId: 'website-business',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for the listed multi-page hosted site. Custom domain is out of scope.',
    nameMatchesScope: true,
    publicNameNote: 'Hosted on omnigrouptech.com — not a custom-domain production site.',
    label: 'Hosted site automated · domain out of scope',
  },
  {
    deliverableId: 'website-ecommerce',
    automationLevel: 'AUTOMATED',
    humanIntervention:
      'None for the listed storefront (catalog, cart, inventory, tax/shipping settings, bank-transfer orders). Stripe LIVE / Connect is EXTERNAL CONFIGURATION REQUIRED.',
    nameMatchesScope: true,
    publicNameNote:
      'Complete sellable storefront. Stripe LIVE / Connect is external configuration — not an incomplete HYBRID shop.',
    label: 'Storefront automated · Stripe LIVE/Connect EXTERNAL CONFIGURATION REQUIRED',
    prePurchaseWarning:
      'Storefront ships complete (catalog, cart, inventory, tax/shipping, bank-transfer orders). Stripe LIVE / Connect merchant wiring is EXTERNAL CONFIGURATION REQUIRED and is not claimed as included.',
  },
  {
    deliverableId: 'white-label-setup',
    automationLevel: 'AUTOMATED',
    humanIntervention:
      'None for brand PDF and hosted partner landing. Partner legal agreements are CONFIGURATION REQUIRED (external counsel).',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Packaging automated · legal CONFIGURATION REQUIRED',
  },
  {
    deliverableId: 'sales-enablement',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for the listed sales PDF pack.',
    nameMatchesScope: true,
    publicNameNote: 'DOCUMENT / consulting deliverable — not a live connected product.',
    label: 'DOCUMENT · consulting PDF pack',
  },
  {
    deliverableId: 'vertical-package',
    automationLevel: 'AUTOMATED',
    humanIntervention:
      'None for CRM/automation seed and vertical brief. Live ads APIs are CONFIGURATION REQUIRED for CONNECTED channels.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Ops pack automated · ads APIs CONFIGURATION REQUIRED',
  },
  {
    deliverableId: 'lead-gen-retainer',
    automationLevel: 'AUTOMATED',
    humanIntervention:
      'None for the COMPLETE ops pack (PDF, CRM, sequences, weekly plan, channel status). Ads/Apollo/LinkedIn are CONFIGURATION REQUIRED / NOT CONNECTED until user keys. Titanis leads_generated stays 0; simulated harvest cannot PASS.',
    nameMatchesScope: true,
    publicNameNote: 'Does not guarantee qualified meetings. Channels are not HYBRID incomplete product.',
    label: 'Ops pack COMPLETE · ads/Apollo CONFIGURATION REQUIRED',
    prePurchaseWarning:
      'Ops pack ships COMPLETE. LinkedIn/Google Ads/Apollo stay NOT CONNECTED until credentials — CONFIGURATION REQUIRED (external). Without keys, Titanis leads_generated=0 and simulated harvest cannot PASS. No guaranteed meetings.',
  },
  {
    deliverableId: 'ai-support-retainer',
    automationLevel: 'AUTOMATED',
    humanIntervention:
      'None for the COMPLETE AI ops pack (inbox, RAG seed, FAQ, ticket queue). HeyGen/D-ID video avatar is CONFIGURATION REQUIRED / NOT CONNECTED until user keys.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Ops pack COMPLETE · HeyGen/D-ID CONFIGURATION REQUIRED',
    prePurchaseWarning:
      'Ops pack ships COMPLETE at the same price without HeyGen/D-ID. Video avatar stays NOT CONNECTED until keys exist — CONFIGURATION REQUIRED (external).',
  },
  {
    deliverableId: 'custom-software',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Factory ships a starter API + SPA scaffold. Production features still need a person.',
    nameMatchesScope: true,
    publicNameNote: 'Name is starter kit, not a finished custom product.',
    label: 'Starter kit automated · not a finished product',
  },
  {
    deliverableId: 'bundle-portal-presence',
    automationLevel: 'AUTOMATED',
    humanIntervention:
      'None for PRODUCT/OPS portal entitlements (incl. CRM view + welcome tasks) plus live niche landing.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'COMPLETE · PRODUCT/OPS portal + live landing',
  },
  {
    deliverableId: 'bundle-sales-launch',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for hosted landing plus sales PDF. Live sales calls are out of scope.',
    nameMatchesScope: true,
    publicNameNote: 'Landing is PRODUCT; sales enablement half is DOCUMENT / consulting.',
    label: 'PRODUCT landing + DOCUMENT sales pack',
  },
  {
    deliverableId: 'bundle-ops-clarity',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for the listed audit and workflow PDF packs.',
    nameMatchesScope: true,
    publicNameNote: 'DOCUMENT / consulting deliverable — dual PDF pack, not a live connected product.',
    label: 'DOCUMENT · consulting dual-PDF pack',
  },
];

const BY_ID = new Map(ROWS.map((row) => [row.deliverableId, row]));

export function getDeliveryHonesty(deliverableId: string): DeliveryHonesty | null {
  return BY_ID.get(deliverableId) ?? null;
}

export function listDeliveryHonesty(): DeliveryHonesty[] {
  return ROWS;
}

export function listNameScopeMismatches(): DeliveryHonesty[] {
  return ROWS.filter((row) => !row.nameMatchesScope);
}

export function deliveryLevelShort(level: AutomationLevel): string {
  switch (level) {
    case 'AUTOMATED':
      return 'Automated';
    case 'SEMI_AUTOMATED':
      return 'Partly automated';
    default:
      return 'Human delivery';
  }
}
