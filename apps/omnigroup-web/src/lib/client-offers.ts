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
      'We turn on login, billing, and notifications in your portal and send a clear setup guide. No tech talk required.',
    readMore:
      'After payment confirmation you get a project in the system, a downloadable setup PDF with checklist, and portal access for billing and notifications. Delivery is automated in about 1–2 days. Custom domain on your DNS and a dedicated VPS are not included — ask if you need those later.',
    when: 'Usually 1–2 days after payment',
    youGet: [
      'Client portal access (login)',
      'Billing & notifications ready',
      'Setup guide PDF + checklist',
    ],
    notIncluded: ['Your own custom domain', 'Dedicated VPS'],
  },
  audit: {
    promise: 'A clear technical report for your business.',
    summary:
      'You receive a PDF audit: what works, what’s risky, a 90-day plan, and a simple ROI view — matched to your industry.',
    readMore:
      'The report covers executive summary, security notes, stack assessment, roadmap, and ROI. You also get a markdown source bundle. This is a document deliverable, not on-site work or legal certification.',
    when: 'Usually within 48 hours',
    youGet: ['Full PDF audit report', 'Industry recommendations', '90-day roadmap + ROI'],
    notIncluded: ['On-site visit', 'Penetration test', 'Legal compliance stamp'],
  },
  'workflow-design': {
    promise: 'Your processes mapped into a ready plan.',
    summary:
      'We design how work should flow — steps, roles, KPIs — and put it in a PDF you can follow or hand to your team.',
    readMore:
      'Includes process map, automation steps, roles, KPIs, and a rollout plan. Building live automations inside your tools is a separate package (Setup or Integration).',
    when: 'Usually within 2–3 days',
    youGet: ['Workflow & SOP PDF', 'Automation step map', 'Roles and KPIs'],
    notIncluded: ['Building automations in your tools'],
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
    summary: 'CRM sample pipeline, automation modules, migration template, and 30 days of support window.',
    readMore:
      'Includes CRM seed, modules, CSV migration template, training outline PDF, and a registered 30-day support window. Hands-on legacy migration and live training calls need a support retainer.',
    when: 'Usually 5–7 days after payment',
    youGet: ['CRM + automation modules', 'Migration CSV template', 'Training outline PDF'],
    notIncluded: ['Hands-on data migration', 'Live training calls'],
  },
  'setup-custom': {
    promise: 'Production checklist pack for teams with their own ops.',
    summary:
      'Deploy manifest, CRM seed, security/backup checklist, and an admin handoff PDF your operations team can execute.',
    readMore:
      'This is a documented production-readiness pack, not a remote deploy onto your VPS. You receive the deploy manifest, CRM seed, and the custom-tier setup PDF (roles, notifications, backup/security checklist, admin handoff). We do not SSH into your servers or run a 24/7 SLA clock. Success: those artifacts are in your portal.',
    when: 'Usually 3–5 days after payment',
    youGet: ['Deploy manifest', 'CRM + modules', 'Enterprise setup PDF'],
    notIncluded: ['Deploy on your servers', '24/7 SLA ops'],
  },
  integration: {
    promise: 'Integration guide your developer can follow.',
    summary: 'PDF + config JSON with webhooks and auth notes — ready for your engineer.',
    readMore:
      'We do not live-connect your Stripe/ERP/CRM or register OAuth apps on third-party tools in this package.',
    when: 'Usually 2–4 days after payment',
    youGet: ['Integration guide PDF', 'Config JSON download', 'Webhook map'],
    notIncluded: ['Live third-party wiring'],
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
    promise: 'Demo storefront with catalog and checkout notes.',
    summary: 'Live demo shop with sample products, cart path, and documented checkout — not a live merchant shop.',
    readMore:
      'You get a hosted demo storefront, sample catalog, and checkout notes. Your own Stripe account, inventory sync, tax, and shipping carriers are not wired. Success: the demo URL and notes are in your portal.',
    when: 'Usually 5–8 days after payment',
    youGet: ['Live demo storefront URL', 'Sample catalog', 'Checkout notes'],
    notIncluded: ['Real payments wiring', 'Inventory sync', 'Your Stripe account'],
  },
  'white-label-setup': {
    promise: 'Partner packaging + live landing for resale.',
    summary: 'Brand PDF and a live landing page positioned for partner sales.',
    readMore: 'Legal partner agreements and partner custom domains are separate.',
    when: 'Usually 4–6 days after payment',
    youGet: ['Brand packaging PDF', 'Live landing page'],
    notIncluded: ['Legal agreements', 'Partner custom domain'],
  },
  'sales-enablement': {
    promise: 'Sales scripts and FAQ your team can use.',
    summary: 'Demo script, outreach hooks, FAQ, and closing checklist in one PDF.',
    readMore: 'Does not include live sales calls or CRM setup for your sales team.',
    when: 'Usually 2–3 days after payment',
    youGet: ['Sales enablement PDF', 'Industry hooks', 'FAQ + closing checklist'],
    notIncluded: ['Live sales calls'],
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
    promise: 'Monthly lead gen into your CRM.',
    summary: 'Lead report, CRM pipeline, and outreach workspace — live hunting needs our outbound stack.',
    readMore:
      'Outbound stack means Instantly/Apollo (or equivalent) plus scraper credentials on Omni’s side — not tools you must buy separately. If that stack is off, you still get the workspace and monthly report; live lead batches do not ship. No guaranteed meetings.',
    when: 'Starts after first payment · renews monthly',
    youGet: ['Monthly lead report', 'CRM + outreach modules'],
    notIncluded: ['Guaranteed meetings'],
  },
  'ai-support-retainer': {
    promise: 'Monthly AI support setup for your clients.',
    summary: 'AI support inbox, knowledge starter, and setup PDF.',
    readMore:
      'HeyGen/D-ID keys are optional. Without them you still get the AI inbox, knowledge seed, and setup PDF at the same price. Video avatar render is skipped until keys are configured — delivery status stays complete for the included artifacts.',
    when: 'Starts after first payment · renews monthly',
    youGet: ['AI support PDF', 'RAG knowledge seed', 'Avatar modules'],
    notIncluded: ['Video avatar without AI keys'],
  },
  'bundle-portal-presence': {
    promise: 'Portal and landing live — one purchase.',
    summary:
      'We turn on your client portal and publish a niche landing page so you can onboard and capture leads without two vendors.',
    readMore:
      'Includes everything in Quick setup and Landing + copy, one timeline in the portal, and industry-tailored copy. Custom domain and full CRM onboarding are separate packages.',
    when: 'Usually 3–5 days after payment',
    youGet: ['Client portal live', 'Live landing URL', 'Setup + landing PDFs', 'Industry landing copy'],
    notIncluded: ['Custom domain DNS', 'Full CRM onboarding'],
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
      'Technical audit and workflow/SOP design together — what to fix and how work should flow in your industry.',
    readMore:
      'Two PDF packs with cross-linked priorities. We do not build automations inside your tools in this bundle.',
    when: 'Usually within 4–5 days',
    youGet: ['Audit PDF', 'Workflow/SOP PDF', '90-day priorities', 'Industry recommendations'],
    notIncluded: ['On-site visit', 'Automation build in your stack'],
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
  availability: PackageAvailability;
  saleStatus: OfferSaleStatus;
  buyHref: string;
  detailsHref: string;
  contactHref: string;
  /** Set when an industry is selected and matrix row exists */
  industryPrimaryProblem?: string;
  industryRecommended?: boolean;
  industryPitch?: string;
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
    availability,
    saleStatus,
    buyHref,
    detailsHref: buildPricingHref({ service: id, category, vertical }),
    contactHref,
    industryPrimaryProblem: row?.primaryProblem,
    industryRecommended: row?.recommendedForIndustry,
    industryPitch: row?.industrySolutionPitch,
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
