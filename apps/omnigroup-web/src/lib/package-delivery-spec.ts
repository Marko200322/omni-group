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
import { parseIndustryPackageId } from './thousand-package-catalog';

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
  /** EUR anchor per factory phase — price = highest defined phase = current. */
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
      'PRODUCT/OPS: real portal entitlements (notifications + billing + CRM view + tasks), welcome onboarding tasks, setup PDF — automated in 24–48h. Automations NOT CONNECTED.',
    descriptionSr:
      'PROIZVOD/OPS: prava portal ovlašćenja (obaveštenja + billing + CRM pregled + tasks), welcome onboarding taskovi, setup PDF — 24–48h. Automatizacije NOT CONNECTED.',
    includes: [
      'Downloadable setup PDF + markdown pack',
      'Portal entitlements: notifications + billing + CRM view + tasks (not task-only theater)',
      'Welcome notification in portal inbox',
      'Actionable welcome onboarding tasks in Tasks queue',
      'Project created in your workspace',
      'Onboarding checklist in PDF',
    ],
    excludes: [
      'Custom domain on your DNS',
      'Dedicated VPS for the client',
      'CRM DEMO pipeline seed (see Full onboarding)',
      'External automations CONNECTED',
    ],
    anchorByPhase: { M0: 349, M1: 399, M3: 419, M4: 419, M6: 690 },
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
        includes: ['Contact form ? CRM lead sync when inbound is live'],
        includesSr: ['Kontakt forma ? CRM sync kad inbound faza bude aktivna'],
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
      'CRM seeded with labeled DEMO/industry template leads, automation module enabled (external automations NOT CONNECTED), substantial migration CSV + training outline, 30-day support window.',
    descriptionSr:
      'CRM sa oznacenim DEMO/industry sample leadovima, automation modul (eksterne automatizacije NOT CONNECTED), CSV + training outline, 30-dnevni support.',
    includes: [
      'Setup PDF + CRM with labeled DEMO / industry template samples',
      'Entitlements: CRM, automation, notifications, billing',
      'Substantial migration CSV template (download)',
      'Training outline (module honesty: automations NOT CONNECTED)',
      '30-day support window registered',
    ],
    excludes: [
      'Hands-on data migration from legacy tools',
      'Live training calls (add Support retainer)',
      'Daily human support without retainer',
      'Claiming external automations are connected',
    ],
    anchorByPhase: { M1: 890, M3: 1095, M4: 1095, M6: 1590 },
    minCheckoutPhase: 'M1',
    phaseUnlocks: [
      {
        fromPhase: 'M2',
        includes: ['Automation workflow templates seeded from your industry'],
        includesSr: ['Automation workflow templates seeded from your industry'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'setup-custom',
    description:
      'Client-executable production deploy runbook (DNS/SSL/backup/monitoring marked PENDING), CRM seed, entitlements, enterprise setup PDF — your ops team executes go-live.',
    descriptionSr:
      'Klijentski production deploy runbook (DNS/SSL/backup/monitoring = PENDING), CRM seed, ovlašćenja, enterprise setup PDF — vaš ops tim izvršava go-live.',
    includes: [
      'Production deploy runbook JSON (actionable checklist)',
      'Honest PENDING status for DNS/SSL/backup/monitoring',
      'CRM demo seed + portal entitlements',
      'Custom-tier setup PDF',
      'Admin handoff runbook section',
    ],
    excludes: [
      'Remote deploy onto client-owned servers',
      'Claiming SSL/domain done when not provisioned',
      '24/7 SLA operations',
      'Backup/monitoring live on client infra without your execution',
    ],
    anchorByPhase: { M3: 1190, M4: 1190, M6: 1290 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'audit',
    description:
      'SERVICE + DOCS: workspace, kickoff ticket, Billing invoice, commercial pack + AI-assisted audit PDF (not a pentest; not PDF-only).',
    descriptionSr:
      'USLUGA + DOCS: workspace, kickoff ticket, faktura u Billing, commercial pack + AI audit PDF (nije pentest; nije samo PDF).',
    includes: [
      'Kickoff ticket + workspace project',
      'Invoice / receipt in Billing',
      'Commercial delivery pack',
      'PDF report (6+ sections) + markdown',
      'Industry-specific recommendations',
    ],
    excludes: [
      'On-site inspection',
      'Penetration testing',
      'Legal compliance sign-off',
      'Live product hosting',
    ],
    anchorByPhase: { M0: 449, M2: 539, M4: 539, M6: 890 },
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
      'SERVICE + DOCS + config: kickoff/workspace + integration-config.json (DOCUMENTED_NOT_LIVE) + guide PDF — tools not pre-wired.',
    descriptionSr:
      'USLUGA + DOCS + config: kickoff/workspace + integration-config.json (DOCUMENTED_NOT_LIVE) + vodic PDF — alati nisu unapred povezani.',
    includes: [
      'Kickoff ticket + workspace + invoice',
      'Integration guide PDF',
      'integration-config.json (env map, webhooks, retry — not live)',
      'Onboarding checklist for when you add API keys',
      'Sample event payloads for developers',
    ],
    excludes: [
      'Live connection to client Stripe/ERP/CRM (CONFIGURATION REQUIRED — external credentials)',
      'OAuth app registration on third-party tools (CONFIGURATION REQUIRED — external)',
      'Claiming tools are already connected without your API keys',
      'Live wired integration',
    ],
    anchorByPhase: { M2: 690, M4: 690, M6: 890 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'workflow-design',
    description:
      'SERVICE + DOCS: kickoff ticket, workspace, invoice + workflow/SOP PDF pack — documents accompany the engagement.',
    descriptionSr:
      'USLUGA + DOCS: kickoff ticket, workspace, faktura + workflow/SOP PDF — dokument prati uslugu.',
    includes: [
      'Kickoff ticket + workspace + invoice',
      'Workflow design PDF + markdown',
      'SOP sections per process step',
      'Roles and KPIs section',
      'Rollout plan section',
    ],
    excludes: [
      'Building automations in client tools (add Setup or Integration)',
      'Live automation CONNECTED',
    ],
    anchorByPhase: { M0: 590, M2: 690, M4: 690, M6: 890 },
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
      'Mesecni retainer: welcome PDF, SLA/onboarding paket, support queue SLA 24h, kickoff tiket, moduli na portalu — odgovori našeg tima.',
    includes: [
      'Welcome PDF',
      'SLA & onboarding pack (downloadable)',
      'FAQ seed (industry Q&A)',
      'Support queue with 24h response target + persisted kickoff ticket',
      'Health-check PDF at kickoff (retainer scheduler refreshes it monthly)',
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
    anchorByPhase: { M0: 199, M2: 249, M4: 249, M6: 299 },
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
        includesSr: ['Mesecni health-check PDF automatski'],
      },
      {
        fromPhase: 'M6',
        includes: ['AI avatar FAQ bot when HeyGen/D-ID keys are live'],
        includesSr: ['AI avatar FAQ bot kad su HeyGen/D-ID kljucevi aktivni'],
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
      'Dedicated retainer: SLA 8h, SLA paket, kickoff tiket, video-meetings modul, mesecni health-check, Slack obaveštenje.',
    includes: [
      'Welcome PDF',
      'SLA & onboarding pack (downloadable)',
      'FAQ seed (industry Q&A)',
      'Support queue with 8h response target + persisted kickoff ticket',
      'Health-check PDF at kickoff and monthly refresh',
      'Workspace project visible in portal',
      'Video meetings module',
      'Monthly health-check task',
      'Maintenance, monitoring & support included in monthly price',
    ],
    excludes: [
      'Private Slack channel setup on client workspace (we notify via webhook)',
      'Live LinkedIn/Google Ads campaign management',
    ],
    anchorByPhase: { M2: 449, M4: 549, M6: 790 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'landing',
    description:
      'Live client-branded landing at /sites/{slug} with niche sales copy (AI + vertical pack) — complete product after publish.',
    descriptionSr:
      'Live klijentski landing na /sites/{slug} sa niche copy-jem (AI + vertical pack) — kompletan proizvod nakon objave.',
    includes: [
      'Published live URL under client brand title',
      'Niche-specific sales copy (not Omni template chrome)',
      'Contact section on the landing',
      'Delivery handoff PDF (URL + analytics/pixel guides)',
    ],
    excludes: [
      'Custom domain DNS',
      'Stock photography licensing',
      'Unlimited revision rounds / brand-voice rewrite',
    ],
    anchorByPhase: { M0: 690, M2: 690, M4: 990, M6: 1290 },
    phaseUnlocks: [
      {
        fromPhase: 'M0',
        includes: ['Favicon + Open Graph meta tags on published page'],
        includesSr: ['Favicon + Open Graph meta tagovi na objavljenoj stranici'],
      },
      {
        fromPhase: 'M1',
        includes: ['Plausible/GA4 placeholder snippet guide (you add the ID)'],
        includesSr: ['Vodic za Plausible/GA4 snippet (vi dodajete ID)'],
      },
      {
        fromPhase: 'M3',
        includes: ['Retargeting pixel placement guide'],
        includesSr: ['Vodic za retargeting pixel'],
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
      'PRODUCT + SERVICE + DOCS: multi-page client-branded business site (5+ pages) live at /sites/{slug}, kickoff ticket, commercial delivery pack, portal Billing/Tasks — not URL+PDF alone.',
    descriptionSr:
      'PROIZVOD + USLUGA + DOCS: visestrani klijentski sajt (5+ strana) live na /sites/{slug}, kickoff ticket, commercial pack, portal Billing/Tasks — nije samo URL+PDF.',
    includes: [
      'Live URL with 5+ niche pages under client brand',
      'Workspace project + kickoff support ticket',
      'Commercial delivery pack + portal Billing/Tasks entitlements',
      'Services, pricing, contact (and supporting) pages with multi-section copy',
      'Delivery handoff PDF (URL + GBP/analytics guides)',
    ],
    excludes: [
      'Custom domain',
      'CMS training',
      'Copywriting beyond AI/vertical first draft',
      'Custom photography / illustration',
    ],
    anchorByPhase: { M0: 1290, M3: 1490, M4: 1490, M6: 2290 },
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
        includesSr: ['Mesecni content refresh task (put ka retaineru)'],
      },
      {
        fromPhase: 'M4',
        includes: ['Contact form ? CRM lead sync when inbound is live'],
        includesSr: ['Kontakt forma ? CRM sync kad inbound faza bude aktivna'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'website-ecommerce',
    description:
      'Complete sellable storefront: live client-branded shop at /sites/{slug} with industry catalog (4+ products), cart, inventory per SKU, configurable tax/shipping, and working order path (bank transfer always; Stripe TEST when platform keys are configured). Stripe LIVE / Connect: CONFIGURATION REQUIRED (external).',
    descriptionSr:
      'Kompletna prodavnica: live shop na /sites/{slug} sa industrijskim katalogom (4+ proizvoda), korpom, zalihama po SKU, podesivim porezom/dostavom i radnim order path-om (bank transfer uvek; Stripe TEST kad su kljucevi konfigurisani). Stripe LIVE / Connect: CONFIGURATION REQUIRED (eksterno).',
    includes: [
      'Live storefront URL (/sites/{slug})',
      'Shop page always present for ecommerce',
      '4+ industry-real catalog products visible in UI',
      'Working cart + shop order API (bank transfer always; Stripe TEST when configured)',
      'Inventory quantity per SKU with stock decrement on order',
      'Configurable tax rate and flat shipping in shop settings (structured on each order)',
      'Order confirmation visible to site owner (CRM contact + in-app notification + order list)',
      'Client-branded title and tagline (not System Admin / Omni chrome)',
      'Delivery handoff PDF with live URL and payment configuration notes',
    ],
    excludes: [
      'Stripe LIVE keys and client Stripe Connect / own merchant account wiring (EXTERNAL CONFIGURATION REQUIRED)',
      'Carrier/API shipping rate engines (flat shipping setting is included)',
      'Product photography and final SKU pricing sign-off (client replaces seed catalog)',
      'Payment processing fees',
      'Ads / remarketing pixel account IDs (EXTERNAL CONFIGURATION REQUIRED)',
    ],
    anchorByPhase: { M3: 1990, M4: 1990, M6: 2790 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'white-label-setup',
    description:
      'White-label brand PDF plus live partner landing (client-branded, not Omni chrome) — complete packaging product.',
    descriptionSr:
      'White-label brand PDF plus live partner landing (klijentski brand, bez Omni chrome-a) — kompletan packaging proizvod.',
    includes: [
      'Brand & packaging PDF',
      'Live partner landing under client brand',
      'Partner resale positioning copy on landing',
      'Favicon + Open Graph meta on partner page',
      'One-pager section for partner pitch in PDF',
    ],
    excludes: [
      'Partner legal agreements (CONFIGURATION REQUIRED — external counsel)',
      'Custom domain DNS (not automated — partner owns DNS)',
    ],
    anchorByPhase: { M2: 1290, M4: 1290, M6: 1590 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'sales-enablement',
    description:
      'SERVICE + DOCS: kickoff ticket, workspace, invoice + sales scripts/FAQ/closing checklist PDF.',
    descriptionSr:
      'USLUGA + DOCS: kickoff ticket, workspace, faktura + sales skripte/FAQ/closing checklist PDF.',
    includes: [
      'Kickoff ticket + workspace + invoice',
      'Sales enablement PDF + markdown',
      'Industry-specific hooks',
      'FAQ from catalog',
      'Demo script + closing checklist',
    ],
    excludes: ['Live sales calls', 'CRM setup for sales team'],
    anchorByPhase: { M2: 690, M4: 690, M6: 890 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'vertical-package',
    description:
      'Monthly: vertical brief PDF, CRM seed, SLA/onboarding pack, workspace project, CRM + automation + billing modules for your industry.',
    descriptionSr:
      'Mesecno: vertical brief PDF, CRM seed, SLA/onboarding paket, workspace projekat, moduli CRM + automation + billing.',
    includes: [
      'Vertical solution PDF',
      'CRM pipeline seeded',
      'SLA & onboarding pack + kickoff ticket',
      'FAQ seed (industry Q&A)',
      'Workspace project visible in portal',
      'Modules: CRM, automation, billing',
      'Monthly vertical ops refresh (CRM/module status pack via retainer scheduler)',
    ],
    excludes: [
      'Video avatar (CONFIGURATION REQUIRED — AI-support retainer + HeyGen/D-ID keys)',
      'Outbound lead hunting in lean mode',
      'Live LinkedIn/Google Ads API (CONFIGURATION REQUIRED — LINKEDIN_ADS_* / GOOGLE_ADS_* + live sync for CONNECTED)',
    ],
    anchorByPhase: { M2: 249, M4: 249, M6: 349 },
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
      'Monthly lead-gen ops pack COMPLETE after payment: deterministic CRM stages, sequence templates, weekly plan, channel board (same industry ? same structure), honest CONNECTED / NOT CONNECTED. Ads sync: LINKEDIN_ADS_* / GOOGLE_ADS_* + MARKETING_ADS_LIVE_SYNC. Live harvest: APOLLO_API_KEY + LEAD_DATABASE_ENABLED + LEAD_DATABASE_ROLLOUT_PHASE=F4 + LEAD_LIVE_HARVEST_ON_KICKOFF — else leads_generated=0; Titanis never invents; simulated harvest cannot PASS.',
    descriptionSr:
      'Mesecni lead-gen ops paket COMPLETE nakon placanja: deterministicki CRM stage-ovi, sequence šabloni, nedeljni plan, channel board (ista industrija ? ista struktura), pošten CONNECTED / NOT CONNECTED. Ads sync: LINKEDIN_ADS_* / GOOGLE_ADS_* + MARKETING_ADS_LIVE_SYNC. Live harvest: APOLLO_API_KEY + LEAD_DATABASE_ENABLED + LEAD_DATABASE_ROLLOUT_PHASE=F4 + LEAD_LIVE_HARVEST_ON_KICKOFF — inace leads_generated=0; Titanis ne izmišlja; simulirani harvest ne može PASS.',
    includes: [
      'Welcome PDF',
      'Honest channel status board (CONNECTED / NOT CONNECTED · ads/Apollo CONFIGURATION REQUIRED)',
      'Deterministic pipeline workspace: CRM stages, sequence templates, weekly plan (industry-aware, reproducible)',
      'CRM and outreach workspace + actionable portal tasks + kickoff ticket',
      'Kickoff report (live harvest only when LEAD_LIVE_HARVEST_ON_KICKOFF + enrichment returns contacts; else leads_generated=0)',
      'SLA & onboarding pack',
      'Workspace project visible in portal',
      'Scheduled pipeline refresh when stack is live',
      'Pipeline maintenance & outreach ops included in subscription',
    ],
    excludes: [
      'Guaranteed qualified meetings',
      'LinkedIn/Google Ads/Apollo live harvest without API credentials (CONFIGURATION REQUIRED — LINKEDIN_ADS_* / GOOGLE_ADS_* / Apollo keys + LEAD_* flags)',
      'Invented Titanis lead counts / simulated harvest / Math.random theater as fulfillment PASS',
      'Works fully in lean prod (scraper/outbound off)',
    ],
    anchorByPhase: { M4: 349, M6: 449 },
    minCheckoutPhase: 'M4',
    phaseUnlocks: [
      {
        fromPhase: 'M5',
        includes: ['Autonomy micro-campaign suggestions in monthly report'],
        includesSr: ['Autonomy micro-kampanje u mesečnom izveštaju'],
      },
      {
        fromPhase: 'M6',
        includes: ['Apollo-enriched lead batches when F4 is live (CONFIGURATION REQUIRED — Apollo keys)'],
        includesSr: ['Apollo lead batch-evi kad je F4 aktivan (CONFIGURATION REQUIRED — Apollo ključevi)'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'ai-support-retainer',
    description:
      'Monthly AI support ops pack COMPLETE after payment: setup PDF, RAG knowledge seed, SLA/onboarding pack, workspace project. HeyGen/D-ID video avatar: CONFIGURATION REQUIRED / NOT CONNECTED until user keys.',
    descriptionSr:
      'Mesecni AI support ops paket COMPLETE nakon placanja: setup PDF, RAG seed, SLA/onboarding paket, workspace projekat. HeyGen/D-ID video avatar: CONFIGURATION REQUIRED / NOT CONNECTED dok nema kljuceva.',
    includes: [
      'Welcome PDF',
      'AI knowledge base starter + FAQ seed',
      'SLA & onboarding pack + kickoff ticket + ticket queue',
      'Workspace project visible in portal',
      'AI assistant, video meetings, and support inbox modules',
      'Support assistant setup pack (honest avatarConfigured / CONFIGURATION REQUIRED / NOT CONNECTED)',
      'AI support maintenance & knowledge updates included monthly',
    ],
    excludes: [
      'Ultra-realistic video avatar without HeyGen/D-ID keys (CONFIGURATION REQUIRED — external)',
    ],
    anchorByPhase: { M3: 279, M4: 279, M5: 279, M6: 349 },
    minCheckoutPhase: 'M3',
    phaseUnlocks: [
      {
        fromPhase: 'M6',
        includes: ['HeyGen/D-ID video avatar render when keys configured (CONFIGURATION REQUIRED)'],
        includesSr: ['HeyGen/D-ID video avatar kad su ključevi podešeni (CONFIGURATION REQUIRED)'],
      },
    ],
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'custom-software',
    description:
      'Productized starter software: downloadable Node API + SPA scaffold archive (tar.gz) with README, .env.example, smoke tests, and handoff PDF — not a finished custom product or unlimited build hours.',
    descriptionSr:
      'Produktivizovani starter softver: preuzimivi Node API + SPA scaffold arhiv (tar.gz) sa README, .env.example, smoke testovima i handoff PDF — nije gotov custom proizvod ni neograničeni razvoj.',
    includes: [
      'Downloadable software-scaffold.tar.gz from portal fulfillment artifacts',
      'README with run and deploy instructions inside the archive',
      '.env.example for local/staging secrets',
      'Smoke tests with testsPassed from real test run',
      'Software handoff PDF (run/deploy documented)',
      'API routes + static SPA shell + SQL schema starter',
    ],
    excludes: ['Unlimited feature development', 'Production launch on client infra', 'App store deployment'],
    anchorByPhase: { M3: 1190, M4: 1190, M6: 1490 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'bundle-portal-presence',
    description:
      'PRODUCT/OPS: quick client portal (login, billing, CRM view, welcome tasks, setup PDF) plus live niche landing — cheaper than buying setup + landing separately.',
    descriptionSr:
      'PROIZVOD/OPS: brzi portal (login, billing, CRM pregled, welcome taskovi, setup PDF) + live landing za nišu — jeftinije nego setup + landing odvojeno.',
    includes: [
      'Everything in Quick setup (incl. CRM view + onboarding tasks)',
      'Everything in Landing + copy',
      'Single project timeline in portal',
      'Industry-tailored landing copy',
    ],
    excludes: [
      'Custom domain DNS',
      'Full CRM onboarding / DEMO seed (see Full onboarding)',
      'External automations CONNECTED',
    ],
    anchorByPhase: { M3: 1190, M4: 1190, M6: 1590 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'bundle-sales-launch',
    description:
      'Live landing plus sales enablement (service companion + PDF) — launch sales and marketing together.',
    descriptionSr:
      'Live landing + sales enablement (service companion + PDF) — prodaja i marketing odjednom.',
    includes: [
      'Live public landing URL',
      'Sales enablement PDF + markdown',
      'Niche outreach hooks in PDF',
      'Contact section on landing',
    ],
    excludes: ['Custom domain', 'Live sales calls', 'CRM setup'],
    anchorByPhase: { M3: 1290, M4: 1390, M6: 1790 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'bundle-ops-clarity',
    description:
      'SERVICE + DOCS: audit + workflow PDFs with kickoff/service companion + invoice — dual consulting pack, not PDF theater.',
    descriptionSr:
      'USLUGA + DOCS: audit + workflow PDF sa kickoff/service companion + fakturom — dual consulting pack, ne PDF theater.',
    includes: [
      'Kickoff ticket + workspace + invoice',
      'Full audit PDF + markdown',
      'Workflow & SOP PDF + markdown',
      'Commercial delivery pack',
      '90-day roadmap cross-linked in audit',
    ],
    excludes: [
      'On-site visit',
      'Building automations in your tools',
    ],
    anchorByPhase: { M3: 1090, M4: 1090, M6: 1490 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'seo-audit',
    description:
      'SERVICE + DOCS: technical SEO crawl, Core Web Vitals, keyword gap analysis, competitor benchmark, 90-day roadmap PDF (one-time). On-page CMS edits NOT CONNECTED until CMS access granted.',
    descriptionSr:
      'USLUGA + DOKUMENTI: tehnicki SEO audit, Core Web Vitals, analiza kljucnih reci, benchmark, 90-dnevni plan (jednokratno). CMS izmene NOT CONNECTED dok nema pristupa.',
    includes: [
      'Technical SEO crawl + indexing report',
      'Core Web Vitals assessment (LCP, INP, CLS)',
      'Keyword gap analysis vs competitors',
      'Competitor SEO benchmark (top 3)',
      'On-page optimization recommendations',
      '90-day SEO roadmap (client-executable; not auto CMS edits)',
      'Kickoff ticket + service companion',
    ],
    excludes: [
      'CMS access / content changes (CONFIGURATION REQUIRED)',
      'Automatic monthly on-page SEO without CMS access',
      'Backlink building / outreach',
      'Google Ads / PPC management',
    ],
    anchorByPhase: { M6: 490 },
    minCheckoutPhase: 'M6',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'email-marketing',
    description:
      'SERVICE + DOCS: campaign strategy, 4 email sequences, 2 SMS blueprints, audience segmentation, compliance checklist. Sending infrastructure CONFIGURATION REQUIRED (Resend/Twilio API keys).',
    descriptionSr:
      'USLUGA + DOKUMENTI: strategija kampanja, 4 email sekvence, 2 SMS šablona, segmentacija publike, compliance checklista.',
    includes: [
      'Campaign strategy document',
      '4 email sequence templates (welcome, nurture, re-engage, post-purchase)',
      '2 SMS campaign blueprints',
      'Audience segmentation framework',
      'CAN-SPAM / GDPR / TCPA compliance checklist',
      'KPI tracking dashboard template',
      'Kickoff ticket + SLA pack',
      'Monthly campaign ops refresh pack (scheduler) while subscription is active',
    ],
    excludes: [
      'Sending infrastructure setup (CONFIGURATION REQUIRED — Resend/Twilio keys)',
      'List building / lead acquisition',
      'Sending live campaigns without your send keys',
    ],
    anchorByPhase: { M6: 349 },
    minCheckoutPhase: 'M6',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'reputation-management',
    description:
      'SERVICE + DOCS: review funnel design, response templates, Google Business profile audit, monitoring dashboard. Automated review requests CONFIGURATION REQUIRED (Google/Yelp API keys).',
    descriptionSr:
      'USLUGA + DOKUMENTI: dizajn review levka, šabloni odgovora, audit Google Business profila, monitoring dashboard.',
    includes: [
      'Google Business Profile audit + optimization guide',
      'Review funnel design (trigger → ask → respond → amplify)',
      '15 response templates (positive, neutral, negative)',
      'Monitoring + alert setup plan',
      'Competitor review benchmark',
      'Monthly growth targets + reporting framework',
      'Kickoff ticket + SLA pack',
      'Monthly reputation ops pulse (scheduler) while subscription is active',
    ],
    excludes: [
      'Google Business / Yelp API configuration (CONFIGURATION REQUIRED)',
      'Automated review requests without API keys',
      'Social media management',
    ],
    anchorByPhase: { M6: 249 },
    minCheckoutPhase: 'M6',
    leanCheckout: true,
    fullCheckout: true,
  },
];

const BY_ID = new Map(PACKAGE_DELIVERY_SPECS.map((s) => [s.deliverableId, s]));

/** Industry SKUs (`base__industry`) resolve to the base capability delivery contract. */
export function resolveDeliverySpecId(deliverableId: string): string {
  const key = deliverableId.trim();
  return parseIndustryPackageId(key)?.baseId ?? key;
}

export function getPackageDeliverySpec(deliverableId: string): PackageDeliverySpec | null {
  return BY_ID.get(resolveDeliverySpecId(deliverableId)) ?? null;
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
  /** Unlocks not yet active at current phase — shown as "coming with factory growth". */
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
