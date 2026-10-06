/**
 * Honest delivery contract per package — keep in sync with
 * atina-platform/atina/src/modules/billing/lib/package-delivery-spec.ts
 *
 * Pricing: anchorByPhase reflects what the factory can deliver today.
 * phaseUnlocks: merged into includes automatically when FACTORY_PHASE advances.
 * Checkout is open for every catalog package; phase/budget only change price and extras.
 */
import { applyAnchorDiscount } from './anchor-pricing';
import {
  FACTORY_PHASE_ORDER,
  getFactoryPhase,
  phaseGte,
  type FactoryPhase,
} from './factory-phase';
import type { ProdMode } from './prod-mode';
import { getProdMode } from './prod-mode';
import { saleStatusFromFlags, type OfferSaleStatus } from './sale-status';

export type { OfferSaleStatus } from './sale-status';

/** Recommended first-sale list — not a checkout gate. */
export const BUDGET_LAUNCH_PACKAGE_IDS = [
  'setup-quick',
  'audit',
  'landing',
  'website-business',
  'workflow-design',
  'support-priority',
] as const;

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
  /** Factory phase where extra capability is included — does not block checkout. */
  minCheckoutPhase?: FactoryPhase;
  /** Extra deliverables auto-added when factory reaches phase. */
  phaseUnlocks?: PhaseUnlock[];
  leanCheckout: boolean;
  fullCheckout: boolean;
  /** When true, never show Buy now — route to quote/contact. */
  quoteOnly?: boolean;
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
      'Project created in your workspace',
      'Onboarding checklist in PDF',
    ],
    excludes: ['Custom domain on your DNS', 'Dedicated VPS for the client'],
    anchorByPhase: { M0: 349, M1: 399, M3: 419, M4: 419, M6: 549 },
    phaseUnlocks: [
      {
        fromPhase: 'M0',
        includes: ['Branded portal welcome PDF (logo + company name from signup)'],
        includesSr: ['Branded portal welcome PDF (logo + naziv firme iz registracije)'],
      },
      {
        fromPhase: 'M0',
        includes: ['Custom-domain DNS checklist PDF (you keep DNS control)'],
        includesSr: ['DNS checklist PDF za custom domen (DNS ostaje kod vas)'],
      },
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
      {
        fromPhase: 'M4',
        includes: ['EU SMB competitive benchmark sheet (PDF) for your industry'],
        includesSr: ['EU SMB benchmark cena/ponuda (PDF) za vašu industriju'],
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
    anchorByPhase: { M1: 890, M3: 1095, M4: 1095, M6: 1690 },
    minCheckoutPhase: 'M1',
    phaseUnlocks: [
      {
        fromPhase: 'M2',
        includes: ['Automation workflow templates seeded from your industry'],
        includesSr: ['Automation workflow šabloni po vašoj industriji'],
      },
    ],
    leanCheckout: true,
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
      'Security/backup checklist section in PDF',
      'Admin handoff runbook section',
    ],
    excludes: ['Deploy on client-owned servers', '24/7 SLA operations', 'Backup/monitoring on client infra'],
    anchorByPhase: { M3: 3490, M4: 3490, M6: 4900 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
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
    anchorByPhase: { M0: 449, M2: 539, M4: 539, M6: 790 },
    phaseUnlocks: [
      {
        fromPhase: 'M0',
        includes: ['Security hygiene checklist (10 items, self-assessment)'],
        includesSr: ['Security hygiene checklist (10 stavki, self-assessment)'],
      },
      {
        fromPhase: 'M1',
        includes: ['Stack comparison table vs 3 common alternatives in your niche'],
        includesSr: ['Tabela poređenja stack-a sa 3 uobičajene alternative u niši'],
      },
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
    includes: [
      'Integration guide PDF',
      'integration-config.json download',
      'Webhook endpoint map',
      'Auth notes for third-party connectors',
      'Sample event payloads for developers',
    ],
    excludes: [
      'Live connection to client Stripe/ERP/CRM',
      'OAuth app registration on third-party tools',
    ],
    anchorByPhase: { M2: 990, M4: 1490, M6: 1990 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'workflow-design',
    description: 'Workflow & SOP pack PDF: process map, automation steps, roles, KPIs, rollout plan.',
    descriptionSr: 'Workflow i SOP PDF: mapa procesa, koraci automatizacije, uloge, KPI, plan uvođenja.',
    includes: [
      'Workflow design PDF',
      'SOP sections per process step',
      'Module mapping',
      'Roles and KPIs section',
      'Rollout plan section',
    ],
    excludes: ['Building automations in client tools (add Setup or Integration)'],
    anchorByPhase: { M0: 590, M2: 690, M4: 790, M6: 990 },
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
      'Monthly retainer: welcome PDF, SLA/onboarding pack, support queue with a 24h response target, kickoff ticket, portal modules — human replies by our team.',
    descriptionSr:
      'Mesečni retainer: welcome PDF, SLA/onboarding paket, support queue SLA 24h, kickoff tiket, moduli na portalu — odgovori našeg tima.',
    includes: [
      'Welcome PDF',
      'SLA & onboarding pack (downloadable)',
      'Support queue with 24h response target + kickoff ticket',
      'Workspace project visible in portal',
      'Notifications, AI support assistant, and ticket inbox',
      'Maintenance & support included in monthly subscription price',
    ],
    excludes: [
      'Unlimited dev hours',
      'Emergency weekend SLA',
      'Separate maintenance invoice (already included)',
      'Live LinkedIn/Google Ads campaign management',
    ],
    anchorByPhase: { M0: 199, M2: 249, M4: 289, M6: 399 },
    phaseUnlocks: [
      {
        fromPhase: 'M0',
        includes: ['FAQ seed document (10 Q&A from your industry catalog)'],
        includesSr: ['FAQ seed dokument (10 pitanja/odgovora iz industry kataloga)'],
      },
      {
        fromPhase: 'M0',
        includes: ['Support ticket categories preset in portal'],
        includesSr: ['Unapred podešene kategorije support tiketa u portalu'],
      },
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
      'Dedicated retainer: 8h response target, SLA pack, kickoff ticket, video-meetings module, monthly health-check task, Slack notify when configured.',
    descriptionSr:
      'Dedicated retainer: SLA 8h, SLA paket, kickoff tiket, video-meetings modul, mesečni health-check, Slack obaveštenje.',
    includes: [
      'Welcome PDF',
      'SLA & onboarding pack (downloadable)',
      'Support queue with 8h response target + kickoff ticket',
      'Workspace project visible in portal',
      'Video meetings module',
      'Monthly health-check task',
      'Maintenance, monitoring & support included in monthly price',
    ],
    excludes: [
      'Private Slack channel setup on client workspace (we notify via webhook)',
      'Live LinkedIn/Google Ads campaign management',
    ],
    anchorByPhase: { M2: 449, M4: 690, M6: 1190 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'landing',
    description:
      'Live client-branded landing at /sites/{slug} with niche sales copy (AI + vertical pack). HYBRID/HUMAN: stock photography, brand voice polish, and unlimited revision rounds are not included.',
    descriptionSr:
      'Live klijentski landing na /sites/{slug} sa niche copy-jem (AI + vertical pack). HYBRID/HUMAN: stock foto, brand voice polish i neograničene revizije nisu uključeni.',
    includes: [
      'Published live URL under client brand title',
      'Niche-specific sales copy (not Omni template chrome)',
      'Contact section on the landing',
      'Delivery handoff PDF (URL + analytics/pixel guides)',
    ],
    excludes: [
      'Custom domain DNS',
      'Stock photography licensing (HUMAN)',
      'Unlimited revision rounds / brand-voice rewrite (HUMAN)',
    ],
    anchorByPhase: { M0: 690, M2: 690, M4: 729, M6: 1290 },
    phaseUnlocks: [
      {
        fromPhase: 'M0',
        includes: ['Favicon + Open Graph meta tags on published page'],
        includesSr: ['Favicon + Open Graph meta tagovi na objavljenoj stranici'],
      },
      {
        fromPhase: 'M1',
        includes: ['Plausible/GA4 placeholder snippet guide (you add the ID)'],
        includesSr: ['Vodič za Plausible/GA4 snippet (vi dodajete ID)'],
      },
      {
        fromPhase: 'M3',
        includes: ['Retargeting pixel placement guide'],
        includesSr: ['Vodič za retargeting pixel'],
      },
      {
        fromPhase: 'M4',
        includes: ['Competitor landing teardown checklist (PDF)'],
        includesSr: ['Checklist analize konkurentske landing strane (PDF)'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'website-business',
    description:
      'Multi-page client-branded business site (5+ pages with real section copy): services, pricing, contact — live at /sites/{slug}. HYBRID/HUMAN: custom photography and brand-voice rewrites beyond first draft are not automated.',
    descriptionSr:
      'Višestrani klijentski sajt (5+ strana sa realnim copy-jem) — live na /sites/{slug}. HYBRID/HUMAN: custom foto i brand-voice rewrite van first draft-a nisu automatizovani.',
    includes: [
      'Live URL with 5+ niche pages under client brand',
      'Linked to your workspace project',
      'Services, pricing, contact (and supporting) pages with multi-section copy',
      'Delivery handoff PDF (URL + GBP/analytics guides)',
    ],
    excludes: [
      'Custom domain',
      'CMS training',
      'Copywriting beyond AI/vertical first draft (HUMAN)',
      'Custom photography / illustration (HUMAN)',
    ],
    anchorByPhase: { M0: 1290, M3: 1690, M4: 1690, M6: 2990 },
    phaseUnlocks: [
      {
        fromPhase: 'M0',
        includes: ['sitemap.xml + robots.txt on live site'],
        includesSr: ['sitemap.xml + robots.txt na live sajtu'],
      },
      {
        fromPhase: 'M2',
        includes: ['Google Business Profile setup checklist PDF'],
        includesSr: ['Google Business Profile setup checklist PDF'],
      },
      {
        fromPhase: 'M3',
        includes: ['Monthly content refresh task (retainer upsell path)'],
        includesSr: ['Mesečni content refresh task (put ka retaineru)'],
      },
      {
        fromPhase: 'M4',
        includes: ['Contact form → CRM lead sync when inbound is live'],
        includesSr: ['Kontakt forma → CRM sync kad inbound faza bude aktivna'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'website-ecommerce',
    description:
      'HYBRID storefront: live client-branded shop at /sites/{slug} with industry catalog (4+ products), cart, and working order path (bank transfer; card when Stripe is enabled). Not a full merchant stack — HUMAN follow-up for real SKUs/photos, inventory sync, tax, Stripe Connect, shipping carriers.',
    descriptionSr:
      'HYBRID prodavnica: live shop na /sites/{slug} sa industrijskim katalogom (4+ proizvoda), korpom i radnim order path-om. Nije pun merchantski stack — HUMAN follow-up za prave SKU/foto, magacin, poreze, Stripe Connect, kurire.',
    includes: [
      'Live storefront URL (/sites/{slug})',
      'Shop page always present for ecommerce',
      '4+ industry-real catalog products visible in UI',
      'Working cart + shop order API (bank transfer / Stripe when enabled)',
      'Client-branded title and tagline (not System Admin / Omni chrome)',
      'Delivery handoff PDF with live URL and HYBRID checkout scope note',
    ],
    excludes: [
      'Real inventory sync (HUMAN)',
      'Client Stripe Connect / own merchant account wiring (HUMAN)',
      'Tax engine and shipping carrier integrations (HUMAN)',
      'Product photography and final SKU pricing sign-off (HUMAN)',
      'Payment processing fees',
    ],
    anchorByPhase: { M3: 3490, M4: 3490, M6: 4900 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'white-label-setup',
    description:
      'White-label brand PDF plus live partner landing (client-branded, not Omni chrome). HYBRID/HUMAN: partner legal agreements and custom domain remain out of automated scope.',
    descriptionSr:
      'White-label brand PDF plus live partner landing (klijentski brand, bez Omni chrome-a). HYBRID/HUMAN: partnerski ugovori i custom domen nisu u automatizovanom scope-u.',
    includes: [
      'Brand & packaging PDF',
      'Live partner landing under client brand',
      'Partner resale positioning copy on landing',
      'Favicon + Open Graph meta on partner page',
      'One-pager section for partner pitch in PDF',
    ],
    excludes: ['Partner legal agreements (HUMAN)', 'Custom domain for partner'],
    anchorByPhase: { M2: 1290, M4: 1790, M6: 2490 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'sales-enablement',
    description: 'Sales enablement PDF: demo script, outreach hooks, FAQ, closing checklist.',
    descriptionSr: 'Sales enablement PDF: demo skripta, outreach hook-ovi, FAQ, closing checklist.',
    includes: [
      'Sales enablement PDF',
      'Industry-specific hooks',
      'FAQ from catalog',
      'Demo script section',
      'Closing checklist section',
    ],
    excludes: ['Live sales calls', 'CRM setup for sales team'],
    anchorByPhase: { M2: 690, M4: 890, M6: 1190 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'vertical-package',
    description:
      'Monthly: vertical brief PDF, CRM seed, SLA/onboarding pack, workspace project, CRM + automation + billing modules for your industry.',
    descriptionSr:
      'Mesečno: vertical brief PDF, CRM seed, SLA/onboarding paket, workspace projekat, moduli CRM + automation + billing.',
    includes: [
      'Vertical solution PDF',
      'CRM pipeline seeded',
      'SLA & onboarding pack + kickoff ticket',
      'Workspace project visible in portal',
      'Modules: CRM, automation, billing',
      'Ongoing maintenance & vertical updates included monthly',
    ],
    excludes: [
      'Video avatar (needs AI-support retainer + HeyGen)',
      'Outbound lead hunting in lean mode',
      'Live LinkedIn/Google Ads API (marked NOT CONNECTED until credentials)',
    ],
    anchorByPhase: { M2: 349, M4: 549, M6: 790 },
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
      'Monthly kickoff pack: lead-gen PDF, CRM pipeline, outreach workspace, channel status sheet (LinkedIn/Google Ads marked NOT CONNECTED until APIs are live) — requires outbound stack.',
    descriptionSr:
      'Mesečni kickoff: lead-gen PDF, CRM, outreach workspace, status kanala (LinkedIn/Google Ads = NOT CONNECTED dok API nije živ) — zahteva outbound stack.',
    includes: [
      'Welcome PDF',
      'Honest channel status (CONNECTED / NOT CONNECTED)',
      'CRM and outreach workspace + kickoff ticket',
      'Kickoff report (live harvest only when channels CONNECTED)',
      'SLA & onboarding pack',
      'Workspace project visible in portal',
      'Scheduled pipeline refresh when stack is live',
      'Pipeline maintenance & outreach ops included in subscription',
    ],
    excludes: [
      'Guaranteed qualified meetings',
      'Pretending LinkedIn/Google Ads are live without API credentials',
      'Works fully in lean prod (scraper/outbound off)',
    ],
    anchorByPhase: { M4: 690, M6: 990 },
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
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'ai-support-retainer',
    description:
      'Monthly: AI support setup pack, RAG knowledge seed, SLA/onboarding pack, workspace project — video avatar needs HeyGen/D-ID keys (otherwise NOT CONNECTED).',
    descriptionSr:
      'Mesečno: AI support setup, RAG seed, SLA/onboarding paket, workspace projekat — video avatar zahteva HeyGen/D-ID (inače NOT CONNECTED).',
    includes: [
      'Welcome PDF',
      'AI knowledge base starter',
      'SLA & onboarding pack + kickoff ticket',
      'Workspace project visible in portal',
      'AI assistant, video meetings, and support inbox modules',
      'Support assistant setup pack (honest avatarConfigured flag)',
      'AI support maintenance & knowledge updates included monthly',
    ],
    excludes: ['Ultra-realistic video without HeyGen/D-ID subscription'],
    anchorByPhase: { M3: 349, M4: 490, M5: 590, M6: 690 },
    minCheckoutPhase: 'M3',
    phaseUnlocks: [
      {
        fromPhase: 'M6',
        includes: ['HeyGen/D-ID video avatar render when keys configured'],
        includesSr: ['HeyGen/D-ID video avatar kad su ključevi podešeni'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'custom-software',
    description:
      'Starter codebase only: Node API + SPA scaffold, tests, handoff PDF — not a finished custom product or unlimited build hours.',
    descriptionSr: 'Samo starter kod: Node API + SPA scaffold, testovi, handoff PDF — nije gotov custom proizvod ni neograničeni razvoj.',
    includes: [
      'Starter project in your workspace',
      'Automated test checklist',
      'Software handoff PDF',
      'API and web app starter kit',
    ],
    excludes: ['Unlimited feature development', 'Production launch on client infra', 'App store deployment'],
    anchorByPhase: { M3: 4900, M4: 4900, M6: 7900 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'bundle-portal-presence',
    description:
      'Combined: quick client portal (login, billing, setup PDF) plus live niche landing — cheaper than buying setup + landing separately.',
    descriptionSr:
      'Kombinovano: brzi portal (login, billing, setup PDF) + live landing za nišu — jeftinije nego setup + landing odvojeno.',
    includes: [
      'Everything in Quick setup',
      'Everything in Landing + copy',
      'Single project timeline in portal',
      'Industry-tailored landing copy',
    ],
    excludes: ['Custom domain DNS', 'Full CRM onboarding (see Full onboarding)'],
    anchorByPhase: { M3: 899, M4: 899, M6: 1090 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'bundle-sales-launch',
    description:
      'Live landing plus sales enablement PDF (demo script, FAQ, hooks) — launch sales and marketing together.',
    descriptionSr:
      'Live landing + sales enablement PDF (demo script, FAQ, hookovi) — prodaja i marketing odjednom.',
    includes: [
      'Live public landing URL',
      'Sales enablement PDF + markdown',
      'Niche outreach hooks in PDF',
      'Contact section on landing',
    ],
    excludes: ['Custom domain', 'Live sales calls', 'CRM setup'],
    anchorByPhase: { M3: 1290, M4: 1290, M6: 1590 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'bundle-ops-clarity',
    description:
      'Technical audit PDF plus workflow/SOP design — priorities and processes in one delivery.',
    descriptionSr:
      'Tehnički audit PDF + workflow/SOP dizajn — prioriteti i procesi u jednoj isporuci.',
    includes: [
      'Full audit PDF + markdown',
      'Workflow & SOP PDF',
      '90-day roadmap cross-linked in audit',
      'Industry-specific recommendations in both docs',
    ],
    excludes: ['On-site visit', 'Building automations in your tools'],
    anchorByPhase: { M3: 990, M4: 990, M6: 1190 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
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
    if (v != null) return applyAnchorDiscount(v);
  }
  for (const key of FACTORY_PHASE_ORDER) {
    const v = spec.anchorByPhase[key];
    if (v != null) return applyAnchorDiscount(v);
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
  if (spec.quoteOnly) return false;
  const m = mode ?? getProdMode();
  return m === 'full' ? spec.fullCheckout : spec.leanCheckout;
}

export type PackageAvailabilityTone = 'available' | 'upcoming' | 'contact';

export type PackageAvailability = {
  checkoutAllowed: boolean;
  saleStatus: OfferSaleStatus;
  badge: string;
  badgeTone: PackageAvailabilityTone;
  statusLabel: string;
};

/** UI label for pricing / products — matches factory phase and lean checkout gates. */
export function getPackageAvailability(deliverableId: string, mode?: ProdMode): PackageAvailability {
  const spec = getPackageDeliverySpec(deliverableId);
  const checkoutAllowed = canCheckoutPackage(deliverableId, mode) && !spec?.quoteOnly;
  const saleStatus = saleStatusFromFlags({
    checkoutAllowed,
    quoteOnly: spec?.quoteOnly,
  });

  if (saleStatus === 'READY_TO_BUY') {
    return {
      checkoutAllowed: true,
      saleStatus,
      badge: 'Ready to buy',
      badgeTone: 'available',
      statusLabel: 'Self-serve checkout is open for this package.',
    };
  }

  if (saleStatus === 'REQUEST_QUOTE') {
    return {
      checkoutAllowed: false,
      saleStatus,
      badge: 'Request a quote',
      badgeTone: 'contact',
      statusLabel: 'This package is sold via quote — contact us for a written proposal.',
    };
  }

  const phase = getFactoryPhase();
  const min = spec?.minCheckoutPhase;
  const opensAt = min && !phaseGte(phase, min) ? min : null;

  return {
    checkoutAllowed: false,
    saleStatus,
    badge: 'Currently under construction',
    badgeTone: 'upcoming',
    statusLabel: opensAt
      ? 'Currently under construction. Contact us for early access — checkout opens when this package is ready.'
      : 'Currently under construction. Contact us if you want to be notified when checkout opens.',
  };
}

export function listCheckoutPackages(mode?: ProdMode): string[] {
  const m = mode ?? getProdMode();
  return PACKAGE_DELIVERY_SPECS.filter((s) => {
    if (s.quoteOnly) return false;
    return m === 'full' ? s.fullCheckout : s.leanCheckout;
  }).map((s) => s.deliverableId);
}

export function applyHonestCatalogDescription<T extends { id: string; description: string }>(item: T): T {
  const spec = getPackageDeliverySpec(item.id);
  if (!spec) return item;
  return { ...item, description: spec.description };
}
