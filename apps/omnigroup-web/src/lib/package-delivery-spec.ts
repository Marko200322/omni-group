/**
 * Honest delivery contract per package — keep in sync with
 * atina-platform/atina/src/modules/billing/lib/package-delivery-spec.ts
 *
 * Pricing: anchorByPhase reflects what the factory can deliver today.
 * phaseUnlocks: merged into includes automatically when FACTORY_PHASE advances.
 */
import {
  FACTORY_PHASE_ORDER,
  getFactoryPhase,
  phaseGte,
  type FactoryPhase,
} from './factory-phase';
import type { ProdMode } from './prod-mode';
import { getProdMode } from './prod-mode';
import { getMonthlyBudgetEur } from './prod-budget';

/** Focus sell list for €200/mo operational budget (warm outreach path). */
export const BUDGET_LAUNCH_PACKAGE_IDS = [
  'setup-quick',
  'audit',
  'landing',
  'website-business',
  'workflow-design',
  'support-priority',
] as const;

const BUDGET_LAUNCH_SET = new Set<string>(BUDGET_LAUNCH_PACKAGE_IDS);

export type PhaseUnlock = {
  fromPhase: FactoryPhase;
  includes: string[];
  includesSr: string[];
};

export type PackageDeliverySpec = {
  deliverableId: string;
  description: string;
  descriptionSr: string;
  /** Base delivery at current factory phase (before phaseUnlocks merge). */
  includes: string[];
  excludes: string[];
  /** EUR anchor per factory phase — price = highest defined phase ≤ current. */
  anchorByPhase: Partial<Record<FactoryPhase, number>>;
  /** Minimum factory phase before checkout is allowed. */
  minCheckoutPhase?: FactoryPhase;
  /** Extra deliverables auto-added when factory reaches phase. */
  phaseUnlocks?: PhaseUnlock[];
  leanCheckout: boolean;
  fullCheckout: boolean;
};

export const PACKAGE_DELIVERY_SPECS: PackageDeliverySpec[] = [
  {
    deliverableId: 'setup-quick',
    description:
      'Client portal with login, billing, notifications, setup PDF, and onboarding pack — automated in 24–48h.',
    descriptionSr:
      'Klijentski portal (login, billing, obaveštenja), setup PDF i onboarding paket — automatizovano za 24–48h.',
    includes: [
      'Downloadable setup PDF + markdown pack',
      'Portal modules: notifications, billing',
      'Product factory project record',
      'Onboarding checklist in PDF',
    ],
    excludes: ['Custom domain on your DNS', 'Dedicated VPS for the client'],
    anchorByPhase: { M0: 349, M1: 399, M3: 449, M4: 449, M6: 549 },
    phaseUnlocks: [
      {
        fromPhase: 'M1',
        includes: ['Contact form → CRM lead sync when inbound is live'],
        includesSr: ['Kontakt forma → CRM sync kad inbound faza bude aktivna'],
      },
      {
        fromPhase: 'M3',
        includes: ['Client public site slot linked in portal'],
        includesSr: ['Javni sajt klijenta povezan na portalu'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'setup-full',
    description:
      'CRM seeded with sample pipeline, automation modules, migration CSV template, training outline PDF, and 30-day support window in the system.',
    descriptionSr:
      'CRM sa demo pipeline-om, automation moduli, CSV šablon, training outline PDF i 30-dnevni support prozor u sistemu.',
    includes: [
      'Setup PDF + CRM with sample leads',
      'Modules: CRM, automation, notifications, billing',
      'Migration CSV template (download)',
      'Training outline document',
      '30-day support window registered',
    ],
    excludes: [
      'Hands-on data migration from legacy tools',
      'Live training calls (add Support retainer)',
      'Daily human support without retainer',
    ],
    anchorByPhase: { M1: 890, M3: 1290, M4: 1290, M6: 1690 },
    minCheckoutPhase: 'M1',
    phaseUnlocks: [
      {
        fromPhase: 'M2',
        includes: ['Automation workflow templates seeded from your industry'],
        includesSr: ['Automation workflow šabloni po vašoj industriji'],
      },
    ],
    leanCheckout: false,
    fullCheckout: true,
  },
  {
    deliverableId: 'setup-custom',
    description:
      'Production deploy manifest (checklist JSON), CRM seed, modules, and enterprise setup PDF — for teams with their own ops.',
    descriptionSr:
      'Production deploy manifest (JSON checklist), CRM seed, moduli i enterprise setup PDF.',
    includes: [
      'Production deploy manifest artifact',
      'CRM seed + full module activation',
      'Custom-tier setup PDF',
    ],
    excludes: ['Deploy on client-owned servers', '24/7 SLA operations', 'Backup/monitoring on client infra'],
    anchorByPhase: { M3: 3490, M4: 3490, M6: 4900 },
    minCheckoutPhase: 'M3',
    leanCheckout: false,
    fullCheckout: true,
  },
  {
    deliverableId: 'audit',
    description:
      'AI technical audit PDF: executive summary, security, stack, 90-day roadmap, and ROI — tailored to industry.',
    descriptionSr:
      'AI tehnički audit PDF: rezime, bezbednost, stack, 90-dnevni plan i ROI — po industriji.',
    includes: ['PDF report (6+ sections)', 'Markdown source bundle', 'Industry-specific recommendations'],
    excludes: ['On-site inspection', 'Penetration testing', 'Legal compliance sign-off'],
    anchorByPhase: { M0: 449, M2: 590, M4: 590, M6: 790 },
    phaseUnlocks: [
      {
        fromPhase: 'M2',
        includes: ['Competitor snapshot appendix (scraper-assisted)'],
        includesSr: ['Prilog sa competitor snapshot-om (scraper)'],
      },
      {
        fromPhase: 'M4',
        includes: ['Lead-enrichment notes for sales follow-up'],
        includesSr: ['Lead enrichment beleške za sales follow-up'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'integration',
    description:
      'Integration guide PDF plus integration-config.json (webhook URLs, auth notes, sample events) — ready for your developer.',
    descriptionSr:
      'Integration vodič PDF + integration-config.json — za vašeg developera.',
    includes: ['Integration guide PDF', 'integration-config.json download', 'Webhook endpoint map'],
    excludes: [
      'Live connection to client Stripe/ERP/CRM',
      'OAuth app registration on third-party tools',
    ],
    anchorByPhase: { M2: 790, M4: 1190, M6: 1490 },
    minCheckoutPhase: 'M2',
    leanCheckout: false,
    fullCheckout: true,
  },
  {
    deliverableId: 'workflow-design',
    description: 'Workflow & SOP pack PDF: process map, automation steps, roles, KPIs, rollout plan.',
    descriptionSr: 'Workflow i SOP PDF: mapa procesa, koraci automatizacije, uloge, KPI, plan uvođenja.',
    includes: ['Workflow design PDF', 'SOP sections per process step', 'Module mapping'],
    excludes: ['Building automations in client tools (add Setup or Integration)'],
    anchorByPhase: { M0: 549, M2: 690, M4: 690, M6: 890 },
    phaseUnlocks: [
      {
        fromPhase: 'M3',
        includes: ['Automation module activation map for your portal'],
        includesSr: ['Mapa automation modula za vaš portal'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'support-priority',
    description:
      'Monthly retainer: welcome PDF, support queue with 24h SLA task, portal modules — human replies by our team.',
    descriptionSr:
      'Mesečni retainer: welcome PDF, support queue SLA 24h, moduli na portalu — odgovori našeg tima.',
    includes: ['Welcome PDF', 'Support automation task (SLA 24h)', 'Modules: notifications, support-avatar, AI-RAG'],
    excludes: ['Unlimited dev hours', 'Emergency weekend SLA'],
    anchorByPhase: { M0: 149, M2: 249, M4: 249, M6: 349 },
    phaseUnlocks: [
      {
        fromPhase: 'M1',
        includes: ['Email notification on new support ticket'],
        includesSr: ['Email obaveštenje na novi support ticket'],
      },
      {
        fromPhase: 'M3',
        includes: ['Monthly health-check PDF auto-generated'],
        includesSr: ['Mesečni health-check PDF automatski'],
      },
      {
        fromPhase: 'M6',
        includes: ['AI avatar FAQ bot when HeyGen/D-ID keys are live'],
        includesSr: ['AI avatar FAQ bot kad su HeyGen/D-ID ključevi aktivni'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'support-dedicated',
    description:
      'Dedicated retainer: 8h SLA, video-meetings module, monthly health-check task, Slack notify when configured.',
    descriptionSr:
      'Dedicated retainer: SLA 8h, video-meetings modul, mesečni health-check, Slack obaveštenje.',
    includes: [
      'Welcome PDF',
      'SLA 8h support queue',
      'Video meetings module',
      'Monthly health-check task',
    ],
    excludes: ['Private Slack channel setup on client workspace (we notify via webhook)'],
    anchorByPhase: { M2: 490, M4: 690, M6: 890 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'landing',
    description: 'Live landing page at /sites/{slug} with AI sales copy — hosted on omnigrouptech.com.',
    descriptionSr: 'Live landing na /sites/{slug} sa AI copy-jem — host na omnigrouptech.com.',
    includes: ['Published live URL', 'AI-generated copy for niche', 'Contact section'],
    excludes: ['Custom domain DNS', 'Stock photography licensing', 'Unlimited revision rounds'],
    anchorByPhase: { M0: 690, M2: 890, M4: 990, M6: 1290 },
    phaseUnlocks: [
      {
        fromPhase: 'M3',
        includes: ['Retargeting pixel placement guide'],
        includesSr: ['Vodič za retargeting pixel'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'website-business',
    description: 'Multi-page business site (5+ pages): services, pricing, contact — live at /sites/{slug}.',
    descriptionSr: 'Višestrani poslovni sajt (5+ strana) — live na /sites/{slug}.',
    includes: ['Live URL with 5+ pages', 'Product factory project linked', 'Services, pricing, contact pages'],
    excludes: ['Custom domain', 'CMS training', 'Copywriting beyond AI first draft'],
    anchorByPhase: { M0: 1290, M3: 1990, M4: 1990, M6: 2990 },
    phaseUnlocks: [
      {
        fromPhase: 'M3',
        includes: ['Monthly content refresh task (retainer upsell path)'],
        includesSr: ['Mesečni content refresh task (put ka retaineru)'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'website-ecommerce',
    description: 'Hosted demo e-commerce storefront (4+ products) + checkout documentation — not a full merchant Stripe shop or inventory system.',
    descriptionSr: 'Demo e-commerce (4+ proizvoda) + dokumentacija checkout-a — nije pun merchantski Stripe shop ni magacin.',
    includes: [
      'Live storefront URL',
      '4+ demo products in catalog',
      'Checkout integration notes in delivery',
    ],
    excludes: ['Real inventory sync', 'Client Stripe account wiring', 'Payment processing fees'],
    anchorByPhase: { M3: 3490, M4: 3490, M6: 4900 },
    minCheckoutPhase: 'M3',
    leanCheckout: false,
    fullCheckout: true,
  },
  {
    deliverableId: 'white-label-setup',
    description: 'White-label brand PDF plus live landing page for partner resale positioning.',
    descriptionSr: 'White-label brand PDF plus live landing za partnersku prodaju.',
    includes: ['Brand & packaging PDF', 'Live landing page (/sites/{slug})'],
    excludes: ['Partner legal agreements', 'Custom domain for partner'],
    anchorByPhase: { M2: 1290, M4: 1790, M6: 2490 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'sales-enablement',
    description: 'Sales enablement PDF: demo script, outreach hooks, FAQ, closing checklist.',
    descriptionSr: 'Sales enablement PDF: demo skripta, outreach hook-ovi, FAQ, closing checklist.',
    includes: ['Sales enablement PDF', 'Industry-specific hooks', 'FAQ from catalog'],
    excludes: ['Live sales calls', 'CRM setup for sales team'],
    anchorByPhase: { M2: 690, M4: 890, M6: 1190 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'vertical-package',
    description: 'Monthly: vertical brief PDF, CRM seed, CRM + automation + billing modules for your industry.',
    descriptionSr: 'Mesečno: vertical brief PDF, CRM seed, moduli CRM + automation + billing.',
    includes: ['Vertical solution PDF', 'CRM pipeline seeded', 'Modules: CRM, automation, billing'],
    excludes: ['Video avatar (needs AI-support retainer + HeyGen)', 'Outbound lead hunting in lean mode'],
    anchorByPhase: { M2: 199, M4: 299, M6: 399 },
    minCheckoutPhase: 'M2',
    phaseUnlocks: [
      {
        fromPhase: 'M4',
        includes: ['Weekly lead report artifact in CRM'],
        includesSr: ['Nedeljni lead izveštaj u CRM-u'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'lead-gen-retainer',
    description:
      'Monthly: lead-gen PDF, CRM pipeline, Titanis workspace run, lead report — requires outbound stack (M4+).',
    descriptionSr: 'Mesečno: lead-gen PDF, CRM, Titanis, lead izveštaj — zahteva outbound stack (M4+).',
    includes: [
      'Welcome PDF',
      'CRM + hunter/titanis/outreach modules',
      'Lead report artifact',
      'Monthly cron tick',
    ],
    excludes: ['Guaranteed qualified meetings', 'Works fully in lean prod (scraper/outbound off)'],
    anchorByPhase: { M4: 499, M6: 699 },
    minCheckoutPhase: 'M4',
    phaseUnlocks: [
      {
        fromPhase: 'M5',
        includes: ['Autonomy micro-campaign suggestions in monthly report'],
        includesSr: ['Autonomy micro-kampanje u mesečnom izveštaju'],
      },
      {
        fromPhase: 'M6',
        includes: ['Apollo-enriched lead batches when F4 is live'],
        includesSr: ['Apollo lead batch-evi kad je F4 aktivan'],
      },
    ],
    leanCheckout: false,
    fullCheckout: true,
  },
  {
    deliverableId: 'ai-support-retainer',
    description:
      'Monthly: AI support setup PDF, RAG knowledge seed, avatar provision — video avatar needs HeyGen/D-ID keys.',
    descriptionSr: 'Mesečno: AI support PDF, RAG seed, avatar — video zahteva HeyGen/D-ID.',
    includes: [
      'Welcome PDF',
      'AI memory / RAG seed',
      'Modules: support-avatar, video-meetings, ai-rag',
      'Avatar provisioning artifact',
    ],
    excludes: ['Ultra-realistic video without HeyGen/D-ID subscription'],
    anchorByPhase: { M3: 299, M4: 349, M5: 399, M6: 449 },
    minCheckoutPhase: 'M3',
    phaseUnlocks: [
      {
        fromPhase: 'M6',
        includes: ['HeyGen/D-ID video avatar render when keys configured'],
        includesSr: ['HeyGen/D-ID video avatar kad su ključevi podešeni'],
      },
    ],
    leanCheckout: false,
    fullCheckout: true,
  },
  {
    deliverableId: 'custom-software',
    description:
      'Starter codebase only: Node API + SPA scaffold, tests, handoff PDF — not a finished custom product or unlimited build hours.',
    descriptionSr: 'Samo starter kod: Node API + SPA scaffold, testovi, handoff PDF — nije gotov custom proizvod ni neograničeni razvoj.',
    includes: [
      'Isolated greenfield project',
      'Build/test gate metadata',
      'Software handoff PDF',
      'Node 20 REST + static SPA scaffold',
    ],
    excludes: ['Unlimited feature development', 'Production launch on client infra', 'App store deployment'],
    anchorByPhase: { M3: 4900, M4: 4900, M6: 7900 },
    minCheckoutPhase: 'M3',
    leanCheckout: false,
    fullCheckout: true,
  },
];

const BY_ID = new Map(PACKAGE_DELIVERY_SPECS.map((s) => [s.deliverableId, s]));

export function getPackageDeliverySpec(deliverableId: string): PackageDeliverySpec | null {
  return BY_ID.get(deliverableId.trim()) ?? null;
}

/** Effective EUR price for current (or given) factory phase. */
export function getPackageAnchorEur(deliverableId: string, phase: FactoryPhase = getFactoryPhase()): number {
  const spec = getPackageDeliverySpec(deliverableId);
  if (!spec?.anchorByPhase) return 0;
  const idx = FACTORY_PHASE_ORDER.indexOf(phase);
  for (let i = idx; i >= 0; i--) {
    const key = FACTORY_PHASE_ORDER[i];
    const v = spec.anchorByPhase[key];
    if (v != null) return v;
  }
  for (const key of FACTORY_PHASE_ORDER) {
    const v = spec.anchorByPhase[key];
    if (v != null) return v;
  }
  return 0;
}

export type ResolvedPackageOffer = {
  includes: string[];
  includesSr: string[];
  /** Unlocks not yet active at current phase — shown as “coming with factory growth”. */
  upcomingUnlocks: PhaseUnlock[];
};

export function resolvePackageOffer(
  deliverableId: string,
  phase: FactoryPhase = getFactoryPhase(),
): ResolvedPackageOffer {
  const spec = getPackageDeliverySpec(deliverableId);
  if (!spec) {
    return { includes: [], includesSr: [], upcomingUnlocks: [] };
  }
  const includes = [...spec.includes];
  const includesSr = [...spec.includes];
  const upcomingUnlocks: PhaseUnlock[] = [];

  for (const unlock of spec.phaseUnlocks ?? []) {
    if (phaseGte(phase, unlock.fromPhase)) {
      includes.push(...unlock.includes);
      includesSr.push(...unlock.includesSr);
    } else {
      upcomingUnlocks.push(unlock);
    }
  }

  return { includes, includesSr, upcomingUnlocks };
}

export function canCheckoutPackage(deliverableId: string, mode?: ProdMode): boolean {
  const spec = getPackageDeliverySpec(deliverableId);
  if (!spec) return true;
  const m = mode ?? getProdMode();
  const modeOk = m === 'full' ? spec.fullCheckout : spec.leanCheckout;
  if (!modeOk) return false;
  if (spec.minCheckoutPhase && !phaseGte(getFactoryPhase(), spec.minCheckoutPhase)) return false;
  if (getMonthlyBudgetEur() <= 250 && !BUDGET_LAUNCH_SET.has(deliverableId.trim())) {
    return false;
  }
  return true;
}

export type PackageAvailabilityTone = 'available' | 'upcoming' | 'contact';

export type PackageAvailability = {
  checkoutAllowed: boolean;
  badge: string;
  badgeTone: PackageAvailabilityTone;
  statusLabel: string;
};

/** UI label for pricing / products — matches factory phase and lean checkout gates. */
export function getPackageAvailability(deliverableId: string, mode?: ProdMode): PackageAvailability {
  const checkoutAllowed = canCheckoutPackage(deliverableId, mode);
  if (checkoutAllowed) {
    return {
      checkoutAllowed: true,
      badge: 'Ready to buy',
      badgeTone: 'available',
      statusLabel: 'Self-serve checkout is open for this package.',
    };
  }

  const spec = getPackageDeliverySpec(deliverableId);
  const phase = getFactoryPhase();
  const min = spec?.minCheckoutPhase;
  const opensAt = min && !phaseGte(phase, min) ? min : null;

  return {
    checkoutAllowed: false,
    badge: 'Currently under construction',
    badgeTone: 'upcoming',
    statusLabel: opensAt
      ? `Currently under construction. Opens automatically at factory phase ${opensAt} — checkout and delivery unlock when the system reaches that phase.`
      : 'Currently under construction. Checkout and automated delivery unlock when this package is enabled for the current factory phase.',
  };
}

export function listCheckoutPackages(mode?: ProdMode): string[] {
  const m = mode ?? getProdMode();
  return PACKAGE_DELIVERY_SPECS.filter((s) => (m === 'full' ? s.fullCheckout : s.leanCheckout))
    .filter((s) => phaseGte(getFactoryPhase(), s.minCheckoutPhase ?? 'M0'))
    .filter((s) => getMonthlyBudgetEur() > 250 || BUDGET_LAUNCH_SET.has(s.deliverableId))
    .map((s) => s.deliverableId);
}

export function applyHonestCatalogDescription<T extends { id: string; description: string }>(item: T): T {
  const spec = getPackageDeliverySpec(item.id);
  if (!spec) return item;
  return { ...item, description: spec.description };
}
