/**
 * Honest delivery contract per package — keep in sync with
 * apps/omnigroup-web/src/lib/package-delivery-spec.ts
 *
 * Checkout is open for every catalog package; phase/budget only change price and extras.
 */
import { config } from '../../../config';
import { applyAnchorDiscount } from './anchor-pricing';
import {
  FACTORY_PHASE_ORDER,
  getFactoryPhase,
  phaseGte,
  type FactoryPhase,
} from './factory-phase';

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
  includes: string[];
  excludes: string[];
  anchorByPhase: Partial<Record<FactoryPhase, number>>;
  minCheckoutPhase?: FactoryPhase;
  phaseUnlocks?: PhaseUnlock[];
  leanCheckout: boolean;
  fullCheckout: boolean;
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
      'CRM seeded with labeled DEMO/industry template leads, automation module enabled (external automations NOT CONNECTED), substantial migration CSV + training outline, 30-day support window.',
    descriptionSr:
      'CRM sa označenim DEMO/industry sample leadovima, automation modul (eksterne automatizacije NOT CONNECTED), CSV + training outline, 30-dnevni support.',
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
    anchorByPhase: { M3: 3490, M4: 3490, M6: 4900 },
    minCheckoutPhase: 'M3',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'audit',
    description:
      'DOCUMENT / consulting deliverable: AI technical audit PDF (executive summary, security, stack, 90-day roadmap, ROI) — not a live connected product.',
    descriptionSr:
      'DOKUMENT / consulting isporuka: AI tehnički audit PDF (rezime, bezbednost, stack, 90-dnevni plan, ROI) — nije live povezan proizvod.',
    includes: [
      'PDF report (6+ sections) — consulting document pack',
      'Markdown source bundle',
      'Industry-specific recommendations',
    ],
    excludes: [
      'On-site inspection',
      'Penetration testing',
      'Legal compliance sign-off',
      'Live connected product / portal module activation',
    ],
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
      'DOCUMENT / consulting deliverable (docs + config): integration guide PDF plus integration-config.json (env map, webhooks, retry) — tools are not pre-connected; not a live connected product.',
    descriptionSr:
      'DOKUMENT / consulting isporuka (docs + config): integration vodič PDF + integration-config.json (env mapa, webhookovi, retry) — alati nisu unapred povezani; nije live povezan proizvod.',
    includes: [
      'Integration guide PDF (document pack)',
      'integration-config.json (env map, webhook endpoints, retry policy)',
      'Onboarding checklist when you add API keys (PDF section + Markdown)',
      'Auth notes for third-party connectors',
      'Sample event payloads for developers',
    ],
    excludes: [
      'Live connection to client Stripe/ERP/CRM (CONFIGURATION REQUIRED — external credentials)',
      'OAuth app registration on third-party tools (CONFIGURATION REQUIRED — external)',
      'Claiming tools are already connected without your API keys',
      'Live connected product',
    ],
    anchorByPhase: { M2: 990, M4: 1490, M6: 1990 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'workflow-design',
    description:
      'DOCUMENT / consulting deliverable: workflow & SOP PDF (process map, automation steps, roles, KPIs, rollout) — not a live connected product.',
    descriptionSr:
      'DOKUMENT / consulting isporuka: workflow i SOP PDF (mapa procesa, koraci automatizacije, uloge, KPI, rollout) — nije live povezan proizvod.',
    includes: [
      'Workflow design PDF — consulting document pack',
      'SOP sections per process step',
      'Module mapping',
      'Roles and KPIs section',
      'Rollout plan section',
    ],
    excludes: [
      'Building automations in client tools (add Setup or Integration)',
      'Live connected product / automation CONNECTED',
    ],
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
    anchorByPhase: { M2: 449, M4: 690, M6: 1190 },
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
      'Multi-page client-branded business site (5+ pages with real section copy): services, pricing, contact — live at /sites/{slug}. Complete hosted site product.',
    descriptionSr:
      'Višestrani klijentski sajt (5+ strana sa realnim copy-jem): usluge, cene, kontakt — live na /sites/{slug}. Kompletan hostovani sajt.',
    includes: [
      'Live URL with 5+ niche pages under client brand',
      'Linked to your workspace project',
      'Services, pricing, contact (and supporting) pages with multi-section copy',
      'Delivery handoff PDF (URL + GBP/analytics guides)',
    ],
    excludes: [
      'Custom domain',
      'CMS training',
      'Copywriting beyond AI/vertical first draft',
      'Custom photography / illustration',
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
      'Complete sellable storefront: live client-branded shop at /sites/{slug} with industry catalog (4+ products), cart, inventory per SKU, configurable tax/shipping, and working order path (bank transfer always; Stripe TEST when platform keys are configured). Stripe LIVE / Connect: CONFIGURATION REQUIRED (external).',
    descriptionSr:
      'Kompletna prodavnica: live shop na /sites/{slug} sa industrijskim katalogom (4+ proizvoda), korpom, zalihama po SKU, podesivim porezom/dostavom i radnim order path-om (bank transfer uvek; Stripe TEST kad su ključevi konfigurisani). Stripe LIVE / Connect: CONFIGURATION REQUIRED (eksterno).',
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
    anchorByPhase: { M3: 3490, M4: 3490, M6: 4900 },
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
    anchorByPhase: { M2: 1290, M4: 1790, M6: 2490 },
    minCheckoutPhase: 'M2',
    leanCheckout: true,
    fullCheckout: true,
  },
  {
    deliverableId: 'sales-enablement',
    description:
      'DOCUMENT / consulting deliverable: sales enablement PDF (demo script, outreach hooks, FAQ, closing checklist) — not a live connected product.',
    descriptionSr:
      'DOKUMENT / consulting isporuka: sales enablement PDF (demo skripta, outreach hook-ovi, FAQ, closing checklist) — nije live povezan proizvod.',
    includes: [
      'Sales enablement PDF — consulting document pack',
      'Industry-specific hooks',
      'FAQ from catalog',
      'Demo script section',
      'Closing checklist section',
    ],
    excludes: ['Live sales calls', 'CRM setup for sales team', 'Live connected product'],
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
      'FAQ seed (industry Q&A)',
      'Workspace project visible in portal',
      'Modules: CRM, automation, billing',
      'Ongoing maintenance & vertical updates included monthly',
    ],
    excludes: [
      'Video avatar (CONFIGURATION REQUIRED — AI-support retainer + HeyGen/D-ID keys)',
      'Outbound lead hunting in lean mode',
      'Live LinkedIn/Google Ads API (CONFIGURATION REQUIRED — LINKEDIN_ADS_* / GOOGLE_ADS_* + live sync for CONNECTED)',
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
      'Monthly lead-gen ops pack COMPLETE after payment: deterministic CRM stages, sequence templates, weekly plan, channel board (same industry → same structure), honest CONNECTED / NOT CONNECTED. Ads sync: LINKEDIN_ADS_* / GOOGLE_ADS_* + MARKETING_ADS_LIVE_SYNC. Live harvest: APOLLO_API_KEY + LEAD_DATABASE_ENABLED + LEAD_DATABASE_ROLLOUT_PHASE=F4 + LEAD_LIVE_HARVEST_ON_KICKOFF — else leads_generated=0; Titanis never invents; simulated harvest cannot PASS.',
    descriptionSr:
      'Mesečni lead-gen ops paket COMPLETE nakon plaćanja: deterministički CRM stage-ovi, sequence šabloni, nedeljni plan, channel board (ista industrija → ista struktura), pošten CONNECTED / NOT CONNECTED. Ads sync: LINKEDIN_ADS_* / GOOGLE_ADS_* + MARKETING_ADS_LIVE_SYNC. Live harvest: APOLLO_API_KEY + LEAD_DATABASE_ENABLED + LEAD_DATABASE_ROLLOUT_PHASE=F4 + LEAD_LIVE_HARVEST_ON_KICKOFF — inače leads_generated=0; Titanis ne izmišlja; simulirani harvest ne može PASS.',
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
      'Mesečni AI support ops paket COMPLETE nakon plaćanja: setup PDF, RAG seed, SLA/onboarding paket, workspace projekat. HeyGen/D-ID video avatar: CONFIGURATION REQUIRED / NOT CONNECTED dok nema ključeva.',
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
    anchorByPhase: { M3: 349, M4: 490, M5: 590, M6: 690 },
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
    anchorByPhase: { M3: 4900, M4: 4900, M6: 7900 },
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
      'DOCUMENT / consulting deliverable: technical audit PDF plus workflow/SOP design — docs pack, not a live connected product.',
    descriptionSr:
      'DOKUMENT / consulting isporuka: tehnički audit PDF + workflow/SOP dizajn — paket dokumenata, nije live povezan proizvod.',
    includes: [
      'Full audit PDF + markdown — consulting document pack',
      'Workflow & SOP PDF — consulting document pack',
      '90-day roadmap cross-linked in audit',
      'Industry-specific recommendations in both docs',
    ],
    excludes: [
      'On-site visit',
      'Building automations in your tools',
      'Live connected product / portal module activation',
    ],
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

export function getMonthlyBudgetEur(): number {
  const raw = process.env.OWNER_MONTHLY_BUDGET_EUR?.trim();
  const n = raw ? Number.parseInt(raw, 10) : 200;
  if (!Number.isFinite(n) || n < 50) return 200;
  return n;
}

export function isLeanProdMode(): boolean {
  return !config.autonomy.enabled && !config.features.scraper;
}

export function canCheckoutPackage(deliverableId: string): boolean {
  const spec = getPackageDeliverySpec(deliverableId);
  if (!spec) return true;
  const lean = isLeanProdMode();
  return lean ? spec.leanCheckout : spec.fullCheckout;
}

export function honestDescriptionFor(deliverableId: string): string | null {
  return getPackageDeliverySpec(deliverableId)?.description ?? null;
}
