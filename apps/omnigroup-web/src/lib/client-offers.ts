/**
 * Client-facing offer copy — plain language, ready to buy.
 * Prices/availability still come from package-delivery-spec + factory gates.
 */
import {
  canCheckoutPackage,
  getPackageAnchorEur,
  getPackageAvailability,
  getPackageDeliverySpec,
  listCheckoutPackages,
  resolvePackageOffer,
  type OfferSaleStatus,
  type PackageAvailability,
} from './package-delivery-spec';
import { getFactoryPhase } from './factory-phase';
import {
  DELIVERABLE_CATALOG,
  DELIVERABLE_CATEGORY_LABELS,
  type DeliverableDefinition,
} from './deliverable-catalog';
import { formatEur } from './category-pricing';
import { formatBillingLabel } from './dynamic-pricing';
import { buildLoginNextForQuote, buildPricingHref } from './checkout-navigation';
import { getIndustryCompetitiveBonusIncludes } from './industry-competitive-includes';
import type { PackageIndustryMatrixRow } from './package-industry-matrix';
import {
  deliveryLevelShort,
  getDeliveryHonesty,
  type AutomationLevel,
} from './delivery-honesty';
import { isCatalogBundle } from './catalog-bundle-ids';
import { getOfferProblems } from './package-problem-specs';

export { isCatalogBundle } from './catalog-bundle-ids';

export type ClientOfferCopy = {
  /** One clear outcome line under the title */
  promise: string;
  /** Short paragraph — always visible */
  summary: string;
  /** Longer detail — behind “Read more” */
  readMore: string;
  /** Human delivery promise */
  when: string;
  /** Max 4 plain “you get” bullets (overrides technical includes when set) */
  youGet: string[];
  /** Max 3 plain “not included” */
  notIncluded: string[];
};

/** Plain-language copy keyed by deliverable id. Keep in sync with what factory can deliver. */
export const CLIENT_OFFER_COPY: Record<string, ClientOfferCopy> = {
  'setup-quick': {
    promise: 'Your client portal, ready to use.',
    summary:
      'PRODUCT/OPS: real portal entitlements (billing, notifications, CRM view, tasks), actionable welcome onboarding tasks, and a setup PDF. Automations stay NOT CONNECTED.',
    readMore:
      'After payment confirmation you get a workspace project, downloadable setup PDF, user_modules for notifications + billing + CRM view + tasks, org billing access, a welcome inbox notice, and actionable onboarding tasks in Tasks. External automations are NOT CONNECTED. CRM DEMO pipeline seed is Full onboarding. Custom domain DNS and a dedicated VPS are not included.',
    when: 'Usually 1–2 days after payment',
    youGet: [
      'Client portal access (login)',
      'Billing, notifications, CRM view & tasks',
      'Welcome onboarding tasks + setup PDF',
    ],
    notIncluded: ['Your own custom domain', 'Dedicated VPS', 'Automations CONNECTED', 'CRM DEMO seed'],
  },
  audit: {
    promise: 'A clear technical report for your business.',
    summary:
      'DOCUMENT / consulting deliverable: a PDF audit (what works, what’s risky, 90-day plan, ROI) — not a live connected product.',
    readMore:
      'The report covers executive summary, security notes, stack assessment, roadmap, and ROI. You also get a markdown source bundle. This is a consulting document pack, not on-site work, legal certification, or a live portal product.',
    when: 'Usually within 48 hours',
    youGet: ['Full PDF audit report', 'Industry recommendations', '90-day roadmap + ROI'],
    notIncluded: ['On-site visit', 'Penetration test', 'Live connected product'],
  },
  'workflow-design': {
    promise: 'Your processes mapped into a ready plan.',
    summary:
      'DOCUMENT / consulting deliverable: process map, roles, KPIs in a PDF you can follow — not a live connected product.',
    readMore:
      'Includes process map, automation steps, roles, KPIs, and a rollout plan. Building live automations inside your tools is a separate package (Setup or Integration). This is a consulting document pack, not a live connected product.',
    when: 'Usually within 2–3 days',
    youGet: ['Workflow & SOP PDF', 'Automation step map', 'Roles and KPIs'],
    notIncluded: ['Building automations in your tools', 'Live connected product'],
  },
  'support-priority': {
    promise: 'Priority help every month.',
    summary:
      'Monthly support with a 24h response target, portal access for tickets, and a welcome pack so you know how to ask for help.',
    readMore:
      'Includes welcome PDF, support queue with a 24h response target, and portal modules for notifications. Unlimited development hours and weekend emergency coverage are not included. The target is not an automated SLA clock.',
    when: 'Starts after first payment · renews monthly',
    youGet: ['24h response target', 'Support in your portal', 'Welcome guide PDF'],
    notIncluded: ['Unlimited build hours', 'Weekend emergency coverage', 'Automated SLA clock'],
  },
  landing: {
    promise: 'A live landing page for your niche.',
    summary:
      'We publish a professional one-page site with sales copy and a contact section — hosted and live under omnigrouptech.com.',
    readMore:
      'You get a published URL on omnigrouptech.com, AI-written copy for your niche, and a contact section. Custom domain DNS, stock photo licenses, and unlimited revision rounds are not included.',
    when: 'Usually 2–4 days after payment',
    youGet: ['Live public URL', 'Niche sales copy', 'Contact section'],
    notIncluded: ['Custom domain DNS', 'Unlimited revisions'],
  },
  'website-business': {
    promise: 'A multi-page business website, live.',
    summary:
      'Services, pricing, and contact pages — published and ready to share. Hosted live under omnigrouptech.com.',
    readMore:
      'Five or more pages (services, pricing, contact, and more), linked to your project in the portal. Custom domain, CMS training, and heavy human copywriting beyond the first AI draft are not included.',
    when: 'Usually 5–7 days after payment',
    youGet: ['Live multi-page site', 'Services, pricing, contact', 'Linked in your portal'],
    notIncluded: ['Custom domain', 'CMS training'],
  },
  'setup-full': {
    promise: 'Full portal onboarding with CRM and training pack.',
    summary:
      'Labeled DEMO/industry CRM samples, automation module enabled (not live connectors), substantial migration CSV, training outline, 30-day support window.',
    readMore:
      'Includes clearly labeled DEMO CRM samples or industry templates, portal entitlements (CRM/automation/notifications/billing), a substantial CSV migration template, training outline that states external automations are NOT CONNECTED, and a registered 30-day support window. Hands-on legacy migration and live training calls need a support retainer.',
    when: 'Usually 5–7 days after payment',
    youGet: ['Labeled CRM demo samples', 'Migration CSV + training outline', 'Automation module (not live connectors)'],
    notIncluded: ['Hands-on data migration', 'Live training calls', 'Fake automations-connected claims'],
  },
  'setup-custom': {
    promise: 'Production checklist pack for teams with their own ops.',
    summary:
      'Client-executable deploy runbook (DNS/SSL/backup PENDING), CRM seed, and admin handoff PDF — your team runs go-live.',
    readMore:
      'This is a documented production-readiness pack, not a remote deploy onto your VPS. You receive an actionable deploy runbook with PENDING statuses for DNS/SSL/backup/monitoring (never claimed done unless executed), CRM demo seed, entitlements, and the custom-tier setup PDF. We do not SSH into your servers or run a 24/7 SLA clock. Success: the honest runbook and CRM seed are in your portal.',
    when: 'Usually 3–5 days after payment',
    youGet: ['Executable deploy runbook', 'CRM demo seed + entitlements', 'Enterprise setup PDF'],
    notIncluded: ['Deploy on your servers', 'SSL/domain auto-completed', '24/7 SLA ops'],
  },
  integration: {
    promise: 'Integration guide your developer can follow.',
    summary:
      'DOCUMENT / consulting deliverable (docs + config): PDF + config JSON with webhooks — not a live connected product.',
    readMore:
      'We do not live-connect your Stripe/ERP/CRM or register OAuth apps on third-party tools in this package. Tools stay DOCUMENTED_NOT_LIVE until your developer wires credentials.',
    when: 'Usually 2–4 days after payment',
    youGet: ['Integration guide PDF', 'Config JSON download', 'Webhook map'],
    notIncluded: ['Live third-party wiring', 'Live connected product'],
  },
  'support-dedicated': {
    promise: 'Dedicated monthly support with a faster response target.',
    summary: '8h response target, video meetings module, and monthly health-check.',
    readMore:
      'A person replies against an 8-hour target. There is no automated SLA clock, business-hours calendar, or breach dashboard yet. Slack on your workspace is notify-via-webhook, not a private channel we create for you.',
    when: 'Starts after first payment · renews monthly',
    youGet: ['8h response-target queue', 'Video meetings module', 'Monthly health-check'],
    notIncluded: ['Private Slack on your workspace'],
  },
  'website-ecommerce': {
    promise: 'Live storefront with catalog, cart, inventory, and working orders.',
    summary:
      'Complete client-branded shop at /sites/{slug}: industry products, cart, per-SKU stock, tax/shipping settings, and bank-transfer orders (Stripe TEST when platform keys are configured). Stripe LIVE / Connect: EXTERNAL CONFIGURATION REQUIRED.',
    readMore:
      'You get a hosted storefront URL, industry catalog (4+ products), shop page, inventory decrement, configurable tax/shipping, and a working cart/order path. Orders show up as CRM contacts and in-app notifications. Client Stripe LIVE / Connect merchant wiring is EXTERNAL CONFIGURATION REQUIRED. Success: buyers can browse and place orders; handoff PDF is in your portal.',
    when: 'Usually 5–8 days after payment',
    youGet: [
      'Live storefront URL',
      'Industry catalog (4+) with stock',
      'Tax/shipping settings on orders',
      'Working cart + order path',
      'Owner order notifications',
    ],
    notIncluded: ['Stripe LIVE / Connect merchant wiring (EXTERNAL CONFIGURATION REQUIRED)'],
  },
  'white-label-setup': {
    promise: 'Partner packaging + live landing for resale.',
    summary: 'Substantial brand PDF and a live partner landing — custom domain DNS is not automated.',
    readMore:
      'Legal partner agreements and custom domain DNS stay with the partner. Delivered public URL is the hosted /sites landing under your brand.',
    when: 'Usually 4–6 days after payment',
    youGet: ['Brand packaging PDF', 'Live partner landing'],
    notIncluded: ['Legal agreements', 'Custom domain DNS (not automated)'],
  },
  'sales-enablement': {
    promise: 'Sales scripts and FAQ your team can use.',
    summary:
      'DOCUMENT / consulting deliverable: demo script, outreach hooks, FAQ, and closing checklist PDF — not a live connected product.',
    readMore:
      'Does not include live sales calls or CRM setup for your sales team. This is a consulting document pack, not a live connected product.',
    when: 'Usually 2–3 days after payment',
    youGet: ['Sales enablement PDF', 'Industry hooks', 'FAQ + closing checklist'],
    notIncluded: ['Live sales calls', 'Live connected product'],
  },
  'vertical-package': {
    promise: 'Monthly industry pack: CRM + automations.',
    summary: 'Vertical brief, CRM pipeline, and core modules for your niche — billed monthly.',
    readMore: 'Video avatar and outbound campaigns are available on higher-tier retainers — ask us which package fits.',
    when: 'Starts after first payment · renews monthly',
    youGet: ['Vertical brief PDF', 'CRM pipeline', 'CRM + automation + billing'],
    notIncluded: ['Outbound hunting in lean mode'],
  },
  'lead-gen-retainer': {
    promise: 'Monthly lead-gen ops pack into your CRM.',
    summary:
      'COMPLETE ops pack: lead report, CRM pipeline, sequences, weekly plan, channel status. Ads/Apollo/LinkedIn: CONFIGURATION REQUIRED / NOT CONNECTED until keys.',
    readMore:
      'Ops pack ships COMPLETE after payment. Without API credentials, channels stay NOT CONNECTED, Titanis leads_generated stays 0, and simulated harvest cannot PASS — that is CONFIGURATION REQUIRED (external), not an incomplete HYBRID product. No guaranteed meetings.',
    when: 'Starts after first payment · renews monthly',
    youGet: ['Monthly ops pack + channel status', 'CRM + outreach modules', 'Sequence templates + weekly plan'],
    notIncluded: [
      'Guaranteed meetings',
      'Ads/Apollo harvest without keys (CONFIGURATION REQUIRED)',
      'Simulated Titanis lead counts as PASS',
    ],
  },
  'ai-support-retainer': {
    promise: 'Monthly AI support ops pack for your clients.',
    summary: 'COMPLETE AI ops pack: inbox, RAG/FAQ seed, ticket queue. HeyGen/D-ID: CONFIGURATION REQUIRED / NOT CONNECTED until keys.',
    readMore:
      'Ops pack ships COMPLETE at the same price without HeyGen/D-ID. Video avatar stays NOT CONNECTED until keys exist — CONFIGURATION REQUIRED (external).',
    when: 'Starts after first payment · renews monthly',
    youGet: ['AI support PDF', 'RAG knowledge seed', 'Ticket queue + FAQ'],
    notIncluded: ['Video avatar without AI keys (CONFIGURATION REQUIRED)'],
  },
  'bundle-portal-presence': {
    promise: 'Portal and landing live — one purchase.',
    summary:
      'PRODUCT/OPS: client portal (billing, notifications, CRM view, welcome tasks) plus a live niche landing — one checkout.',
    readMore:
      'Includes everything in Quick setup (CRM view + onboarding tasks) and Landing + copy, one timeline in the portal, and industry-tailored copy. Custom domain, Full CRM DEMO seed, and automations CONNECTED are separate.',
    when: 'Usually 3–5 days after payment',
    youGet: ['Client portal + CRM view', 'Live landing URL', 'Welcome tasks + setup PDF', 'Industry landing copy'],
    notIncluded: ['Custom domain DNS', 'Full CRM DEMO seed', 'Automations CONNECTED'],
  },
  'bundle-sales-launch': {
    promise: 'Page live + sales kit for your niche.',
    summary:
      'Live landing plus sales enablement PDF (scripts, FAQ, hooks) so marketing and sales start aligned.',
    readMore:
      'Combines public landing URL with sales enablement deliverables. Does not include CRM setup or live sales coaching.',
    when: 'Usually 4–6 days after payment',
    youGet: ['Live landing URL', 'Sales enablement PDF', 'Niche outreach hooks', 'Contact on page'],
    notIncluded: ['Custom domain', 'CRM pipeline setup'],
  },
  'bundle-ops-clarity': {
    promise: 'Audit + workflow plan in one delivery.',
    summary:
      'DOCUMENT / consulting deliverable: technical audit and workflow/SOP PDFs — docs pack, not a live connected product.',
    readMore:
      'Two PDF packs with cross-linked priorities. We do not build automations inside your tools or activate live portal products in this bundle.',
    when: 'Usually within 4–5 days',
    youGet: ['Audit PDF', 'Workflow/SOP PDF', '90-day priorities', 'Industry recommendations'],
    notIncluded: ['On-site visit', 'Automation build in your stack', 'Live connected product'],
  },
  'custom-software': {
    promise: 'Software starter kit — scaffold + tests, not a finished custom product.',
    summary: 'Isolated Node API + SPA starter with test gate and handoff PDF.',
    readMore:
      'Priced as a starter codebase. Not unlimited feature development, production launch on your infra, or app-store deployment.',
    when: 'Usually 7–10 days after payment',
    youGet: ['Isolated starter project', 'Test gate metadata', 'Handoff PDF'],
    notIncluded: ['Unlimited features', 'Full product build', 'App store deploy'],
  },
};

export type { OfferSaleStatus };

export type ClientOffer = {
  id: string;
  slug: string;
  name: string;
  category: DeliverableDefinition['category'];
  categoryLabel: string;
  billing: DeliverableDefinition['billing'];
  billingPeriod: DeliverableDefinition['billing'];
  currency: 'EUR';
  priceEur: number;
  checkoutEnabled: boolean;
  priceLabel: string;
  promise: string;
  summary: string;
  readMore: string;
  when: string;
  youGet: string[];
  notIncluded: string[];
  /** From deliverable catalog — shown when package naming is abstract. */
  bestFor?: string;
  availability: PackageAvailability;
  saleStatus: OfferSaleStatus;
  buyHref: string;
  detailsHref: string;
  contactHref: string;
  /** Set when an industry is selected and matrix row exists */
  industryPrimaryProblem?: string;
  industryRecommended?: boolean;
  industryPitch?: string;
  /** 5–7 client problems this package attacks (OmniTrix) */
  solvesProblems: string[];
  automationLevel: AutomationLevel;
  deliveryLabel: string;
  humanIntervention: string;
  prePurchaseWarning?: string;
  isBundle: boolean;
};

/**
 * Canonical public list price (EUR).
 * This is the only number Pricing / Products / Services / detail / checkout / Stripe may show or charge.
 * Do not substitute calculateDeliverableQuote — that M6 market engine is analytics-only
 * (e.g. setup-quick list 549 vs quote@intensity55 = 1074).
 */
export function getPublicListPriceEur(deliverableId: string): number {
  return getPackageAnchorEur(deliverableId);
}

export function saleStatusFromAvailability(availability: PackageAvailability): OfferSaleStatus {
  return availability.saleStatus;
}

const OPENS_LATER_COPY = /when (this )?package opens|when package is open|opens? for checkout|factory grows/i;

export function publicOfferWhen(
  copyWhen: string,
  saleStatus: OfferSaleStatus,
  billing: DeliverableDefinition['billing'],
): string {
  if (saleStatus === 'REQUEST_QUOTE') return 'We reply with a scoped quote.';
  if (saleStatus === 'COMING_SOON') {
    return 'Not for sale yet — ask us for early access.';
  }
  if (OPENS_LATER_COPY.test(copyWhen)) {
    return billing === 'monthly'
      ? 'Starts after first payment · renews monthly'
      : 'After payment confirmation';
  }
  return copyWhen;
}

export function getPublicCatalogStats() {
  const { available, later } = listClientOffers();
  const all = [...available, ...later];
  const services = all.filter((o) => !o.isBundle);
  const bundles = all.filter((o) => o.isBundle);
  return {
    catalogSkuCount: all.length,
    expertServiceCount: services.length,
    bundleCount: bundles.length,
    readyToBuyCount: available.length,
    comingSoonCount: later.length,
  };
}

function fallbackCopy(d: DeliverableDefinition): ClientOfferCopy {
  const spec = getPackageDeliverySpec(d.id);
  const offer = resolvePackageOffer(d.id);
  return {
    promise: d.description,
    summary: spec?.description ?? d.description,
    readMore: [
      ...(offer.includes.length ? [`Includes: ${offer.includes.join('; ')}.`] : []),
      ...(spec?.excludes?.length ? [`Not included: ${spec.excludes.join('; ')}.`] : []),
    ].join(' ') || d.description,
    when: d.billing === 'monthly' ? 'Monthly after payment' : 'After payment confirmation',
    youGet: offer.includes.slice(0, 4),
    notIncluded: (spec?.excludes ?? []).slice(0, 3),
  };
}

export function getClientOffer(
  id: string,
  opts?: { category?: string; vertical?: string; industryRow?: PackageIndustryMatrixRow | null },
): ClientOffer | null {
  const d = DELIVERABLE_CATALOG.find((x) => x.id === id);
  if (!d) return null;
  const copy = CLIENT_OFFER_COPY[id] ?? fallbackCopy(d);
  const resolved = resolvePackageOffer(id, getFactoryPhase());
  const row = opts?.industryRow;
  const bonusIncludes =
    row?.competitiveBonusIncludes ??
    (opts?.category
      ? getIndustryCompetitiveBonusIncludes(opts.category, id, row?.recommendedForIndustry)
      : []);
  const baseYouGet =
    resolved.includes.length > 0 ? resolved.includes.slice(0, 6) : copy.youGet;
  const mergedYouGet = Array.from(new Set([...bonusIncludes, ...baseYouGet])).slice(0, 7);
  const summary = row?.primaryProblem?.trim() ? row.primaryProblem : copy.summary;
  const promise =
    row?.recommendedForIndustry && row.businessOutcome
      ? row.businessOutcome.split('—')[0]?.trim() || copy.promise
      : copy.promise;
  const priceEur = getPublicListPriceEur(id);
  const availability = getPackageAvailability(id);
  const saleStatus = saleStatusFromAvailability(availability);
  const category = opts?.category;
  const vertical = opts?.vertical;
  const contactHref = `/contact?service=${encodeURIComponent(id)}${
    category ? `&category=${encodeURIComponent(category)}` : ''
  }`;
  const buyHref =
    saleStatus === 'READY_TO_BUY'
      ? buildLoginNextForQuote({ service: id, category, vertical })
      : contactHref;
  return {
    id: d.id,
    slug: d.id,
    name: d.name,
    category: d.category,
    categoryLabel: DELIVERABLE_CATEGORY_LABELS[d.category],
    billing: d.billing,
    billingPeriod: d.billing,
    currency: 'EUR',
    priceEur,
    checkoutEnabled: saleStatus === 'READY_TO_BUY',
    priceLabel: `${formatEur(priceEur)} ${formatBillingLabel(d.billing)}`,
    promise,
    summary,
    readMore: row?.industrySolutionPitch
      ? `${copy.readMore} ${row.industrySolutionPitch}`.trim()
      : copy.readMore,
    when: publicOfferWhen(copy.when, saleStatus, d.billing),
    youGet: mergedYouGet,
    notIncluded: copy.notIncluded,
    bestFor: d.bestFor,
    availability,
    saleStatus,
    buyHref,
    detailsHref: buildPricingHref({ service: id, category, vertical }),
    contactHref,
    industryPrimaryProblem: row?.primaryProblem,
    industryRecommended: row?.recommendedForIndustry,
    industryPitch: row?.industrySolutionPitch,
    solvesProblems:
      row?.secondaryProblems?.length
        ? [row.primaryProblem, ...row.secondaryProblems].filter(Boolean).slice(0, 7)
        : getOfferProblems(d.id),
    automationLevel: getDeliveryHonesty(d.id)?.automationLevel ?? 'SEMI_AUTOMATED',
    deliveryLabel: getDeliveryHonesty(d.id)?.label ?? deliveryLevelShort('SEMI_AUTOMATED'),
    humanIntervention:
      getDeliveryHonesty(d.id)?.humanIntervention ??
      'A person may still finish steps that are outside the listed artifacts.',
    prePurchaseWarning: getDeliveryHonesty(d.id)?.prePurchaseWarning,
    isBundle: isCatalogBundle(d.id),
  };
}

export function listClientOffers(opts?: {
  category?: string;
  vertical?: string;
  industryMatrix?: Map<string, PackageIndustryMatrixRow>;
  /** only packages open for self-serve checkout */
  availableOnly?: boolean;
  /** Hide bundle SKUs — they have their own Pricing panel. */
  excludeBundles?: boolean;
}): { available: ClientOffer[]; later: ClientOffer[] } {
  const available: ClientOffer[] = [];
  const later: ClientOffer[] = [];
  for (const d of DELIVERABLE_CATALOG) {
    const offer = getClientOffer(d.id, {
      category: opts?.category,
      vertical: opts?.vertical,
      industryRow: opts?.industryMatrix?.get(d.id) ?? null,
    });
    if (!offer) continue;
    if (opts?.excludeBundles && offer.isBundle) continue;
    if (canCheckoutPackage(d.id)) available.push(offer);
    else if (!opts?.availableOnly) later.push(offer);
  }
  // Stable: checkout list order first for available
  const order = listCheckoutPackages();
  available.sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  return { available, later };
}

/** Flat public catalog — every marketing surface must iterate this, not a second list. */
export function listPublicProducts(opts?: Parameters<typeof listClientOffers>[0]): ClientOffer[] {
  const { available, later } = listClientOffers(opts);
  return [...available, ...later];
}
