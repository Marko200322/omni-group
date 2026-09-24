/**
 * Honest delivery contract for public marketing.
 * Do not claim AUTOMATED unless the factory ships the listed artifacts
 * without a human finishing the commercial scope.
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
    humanIntervention: 'None for the listed portal, PDF, and project artifacts.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Automated after payment',
  },
  {
    deliverableId: 'setup-full',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Factory opens CRM/automation modules; migration and training still need a person.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Factory starts it · human finishes onboarding',
  },
  {
    deliverableId: 'setup-custom',
    automationLevel: 'HUMAN_DELIVERY',
    humanIntervention: 'Domain, SSL, backup, monitoring, and SLA work is implemented by a person.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Human implementation after payment',
  },
  {
    deliverableId: 'audit',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for the listed audit PDF pack.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Automated after payment',
  },
  {
    deliverableId: 'integration',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Guide PDF and config map are generated; live third-party wiring is not included.',
    nameMatchesScope: true,
    publicNameNote: 'Name is “Custom integration”; scope is a documented integration pack, not a live connect.',
    label: 'Docs automated · live wiring not included',
  },
  {
    deliverableId: 'workflow-design',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for the listed SOP / workflow PDF.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Automated after payment',
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
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Factory publishes a hosted landing; copy is an AI first draft, not a custom brand system.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Hosted page automated · copy is a first draft',
  },
  {
    deliverableId: 'website-business',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Factory publishes a multi-page hosted site; custom domain and CMS training are not included.',
    nameMatchesScope: true,
    publicNameNote: 'Hosted on omnigrouptech.com — not a custom-domain production site.',
    label: 'Hosted site automated · domain work not included',
  },
  {
    deliverableId: 'website-ecommerce',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Factory publishes a demo storefront and checkout notes. A person is needed for a real merchant shop.',
    nameMatchesScope: true,
    publicNameNote:
      'Public name is E-commerce demo storefront — not a full merchant e-commerce website.',
    label: 'Demo storefront automated · not a live merchant shop',
  },
  {
    deliverableId: 'white-label-setup',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Brand PDF and hosted landing are generated; partner legal and partner DNS are not included.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Packaging automated · legal/DNS not included',
  },
  {
    deliverableId: 'sales-enablement',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for the listed sales PDF pack.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Automated after payment',
  },
  {
    deliverableId: 'vertical-package',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'CRM/automation modules and a vertical brief are opened; industry tailoring is a seed, not a rebuild.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Workspace seeded · not a custom rebuild',
  },
  {
    deliverableId: 'lead-gen-retainer',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Workspace and monthly report are created; outbound quality depends on the live stack and a person.',
    nameMatchesScope: true,
    publicNameNote: 'Does not guarantee qualified meetings.',
    label: 'Workspace automated · outbound still needs a person',
    prePurchaseWarning:
      'Price does not change if you have no outbound stack. You still get the CRM workspace and monthly report; live prospecting does not run without Instantly/Apollo (or equivalent) configured on our side.',
  },
  {
    deliverableId: 'ai-support-retainer',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Knowledge seed and assistant modules are opened; video avatar needs configured provider keys.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Assistant seeded · video needs provider keys',
    prePurchaseWarning:
      'Price does not change if HeyGen/D-ID keys are missing. You still get the AI inbox, RAG seed, and setup PDF. Video avatar render is skipped until those keys exist.',
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
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Combines automated portal artifacts with a hosted landing first draft.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Portal automated · landing is a first draft',
  },
  {
    deliverableId: 'bundle-sales-launch',
    automationLevel: 'SEMI_AUTOMATED',
    humanIntervention: 'Hosted landing plus sales PDF; live sales calls are not included.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Pack + page automated · no live sales calls',
  },
  {
    deliverableId: 'bundle-ops-clarity',
    automationLevel: 'AUTOMATED',
    humanIntervention: 'None for the listed audit and workflow PDF packs.',
    nameMatchesScope: true,
    publicNameNote: '',
    label: 'Automated after payment',
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
